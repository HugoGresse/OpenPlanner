import { Faq, FaqCategory } from '../../types'
import { getDocs } from 'firebase/firestore'
import { collections } from '../../services/firebase'
import { collection } from '@firebase/firestore'

export const getFaq = async (eventId: string): Promise<FaqCategory[]> => {
    const snapshots = await getDocs(collections.faq(eventId))

    const faqCategory = snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
    }))

    const faqItems = await Promise.all(faqCategory.map((category) => getFaqItems(eventId, category.id)))

    return faqCategory.map((category, index) => ({
        ...category,
        faqs: faqItems[index] || [],
    }))
}

const getFaqItems = async (eventId: string, faqId: string): Promise<Faq[]> => {
    const snapshots = await getDocs(collection(collections.faq(eventId), `${faqId}/items`))

    return snapshots.docs.map((snapshot) => ({
        ...(snapshot.data() as Faq),
    }))
}
