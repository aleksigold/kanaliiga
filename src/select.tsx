import type { Dispatch, SetStateAction } from 'react';

interface Props {
  value: string | undefined;
  onChange: Dispatch<SetStateAction<string | undefined>>;
  options: string[] | undefined;
  defaultOption: string;
  id: string;
  label: string;
}

const Select = ({
  value,
  onChange,
  options,
  defaultOption,
  id,
  label,
}: Props) => {
  if (!options) {
    return null;
  }

  return (
    <>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        onChange={({ target }) => onChange(target.value)}
        value={value}
      >
        {!value && <option value="">{defaultOption}</option>}
        {options.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </>
  );
};

export default Select;
