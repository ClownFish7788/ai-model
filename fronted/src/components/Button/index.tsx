import { useState } from 'react'
import styles from './Button.module.scss'
import classNames from 'classnames'

type Props = {
    content: string,
    callback?: () => void,
    selected?: boolean,
    type?: 'button' | 'switch'
}

const Button = ({content, callback, selected = false, type = 'button'}: Props) => {
    const [isSelected, setIsSelected] = useState(false)
    const handleClick: () => void = () => {
        if(selected) {
            callback?.()
        } else if(type === 'switch') {
            setIsSelected(prev => !prev)
        }
    }
    return (
        <button
            className={classNames(
                styles.btn, 
                (isSelected || selected) && styles.selected
            )}
            onClick={handleClick}
        >{content}</button>
    )
}

export default Button