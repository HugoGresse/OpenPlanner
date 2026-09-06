import { describe, expect, test } from 'vitest'
import { markdownToMrkdwn, stripMentions, threadToChatMessages } from './slackFormat'

const bot = 'U0BOT'

describe('stripMentions', () => {
    test('removes bot mentions and collapses whitespace', () => {
        expect(stripMentions('<@U0BOT> fix   the typo <@U0BOT|planner>')).toBe('fix the typo')
    })
})

describe('markdownToMrkdwn', () => {
    test('converts bold, headers, links and bullets', () => {
        expect(markdownToMrkdwn('## Title\n**bold** and [site](https://x.io)\n* item\n+ other')).toBe(
            '*Title*\n*bold* and <https://x.io|site>\n- item\n- other'
        )
    })

    test('escapes & < > once and leaves generated links intact', () => {
        expect(markdownToMrkdwn('R&D &amp; more')).toBe('R&amp;D &amp; more')
        expect(markdownToMrkdwn('durationMinutes < 30 and > 60, see <speaker name>')).toBe(
            'durationMinutes &lt; 30 and &gt; 60, see &lt;speaker name&gt;'
        )
        expect(markdownToMrkdwn('[docs](https://x.io/a?b=1&c=2)')).toBe('<https://x.io/a?b=1&amp;c=2|docs>')
        expect(markdownToMrkdwn('__init__ stays')).toBe('__init__ stays')
    })
})

describe('threadToChatMessages', () => {
    test('maps bot replies to assistant, strips mentions, keeps current message once', () => {
        const messages = threadToChatMessages(
            [
                { ts: '1', user: 'U1', text: '<@U0BOT> list speakers' },
                { ts: '2', user: bot, text: 'Here are 3 speakers' },
                { ts: '3', user: 'U1', text: '<@U0BOT> rename Alice to Alicia' },
            ],
            bot,
            '<@U0BOT> rename Alice to Alicia'
        )
        expect(messages).toEqual([
            { role: 'user', content: 'list speakers' },
            { role: 'assistant', content: 'Here are 3 speakers' },
            { role: 'user', content: 'rename Alice to Alicia' },
        ])
    })

    test('appends the current message when the thread fetch failed', () => {
        expect(threadToChatMessages([], bot, '<@U0BOT> hello')).toEqual([{ role: 'user', content: 'hello' }])
    })

    test('skips proposal cards and batch banners posted by the bot', () => {
        const messages = threadToChatMessages(
            [
                { ts: '1', user: 'U1', text: 'rename Alice' },
                { ts: '2', bot_id: 'B1', text: 'Queued 1 change' },
                {
                    ts: '3',
                    bot_id: 'B1',
                    text: '⏳ Pending review: Update speaker Alice',
                    blocks: [{ type: 'section' }, { type: 'actions' }],
                },
                {
                    ts: '4',
                    bot_id: 'B1',
                    text: '✅ Applied: Update speaker Alice',
                    blocks: [{ type: 'section' }, { type: 'context' }],
                },
            ],
            bot,
            'thanks'
        )
        expect(messages).toEqual([
            { role: 'user', content: 'rename Alice' },
            { role: 'assistant', content: 'Queued 1 change' },
            { role: 'user', content: 'thanks' },
        ])
    })

    test('merges consecutive same-role messages and drops leading assistant text', () => {
        const messages = threadToChatMessages(
            [
                { ts: '1', bot_id: 'B1', text: 'Thinking…' },
                { ts: '2', user: 'U1', text: 'first' },
                { ts: '3', user: 'U2', text: 'second' },
                { ts: '4', user: 'U1', subtype: 'channel_join', text: 'joined' },
            ],
            bot,
            'second'
        )
        expect(messages).toEqual([{ role: 'user', content: 'first\n\nsecond' }])
    })
})
