import { ButtonBase } from '@mui/material'
import type { Person } from '../../types/transaction'
import './MemberTabs.css'

export function MemberTabs({
  people,
  selected,
  onChange,
  ariaLabel = 'Dashboard member',
}: {
  people: readonly Person[]
  selected: Person
  onChange: (person: Person) => void
  ariaLabel?: string
}) {
  if (people.length === 0) return null
  return (
    <div aria-label={ariaLabel} className="member-tabs" role="group">
      {people.map((person) => (
        <ButtonBase
          aria-pressed={person === selected}
          className={`member-tab${person === selected ? ' member-tab--selected' : ''}`}
          key={person}
          onClick={() => onChange(person)}
        >
          {person}
        </ButtonBase>
      ))}
    </div>
  )
}
