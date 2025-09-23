import type { Dispatch, SetStateAction } from 'react';

interface Props {
  value: string | undefined;
  onChange: Dispatch<SetStateAction<string | undefined>>;
  options: string[] | undefined;
  id: string;
  label: string;
}

const Select = ({ value, onChange, options, id, label }: Props) => {
  const select = (
    <select
      id={id}
      onChange={({ target }) => onChange(target.value)}
      value={value}
    >
      {options?.map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </select>
  );

  return (
    <div
      style={{
        marginRight: '.25em',
        marginBottom: '.25em',
        display: 'inline-block',
      }}
    >
      <label htmlFor={id} style={{ marginRight: '.25em ' }}>
        {label}:
      </label>
      {options ? select : 'Loading...'}
    </div>
  );
};

export default Select;
