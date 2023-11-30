import * as React from 'react'
import { Event, FaqCategory } from '../../../types'
import { useFaq } from '../../../services/hooks/useFaq'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'

export type FaqCategoryProps = {
    event: Event
    category: FaqCategory
}

export const FaqCategoryItem = (props: FaqCategoryProps) => {
    const categoryId = props.category.id
    const queryResult = useFaq(props.event, categoryId)

    console.log(queryResult)

    if (queryResult.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={queryResult} />
    }

    const data = queryResult.data || []

    return (
        <>
            {props.category.name} - {categoryId}
            {data.map((faq) => (
                <div key={faq.id}>{faq.question}</div>
            ))}
        </>
    )
}
