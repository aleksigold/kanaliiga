import type { ReactNode } from 'react';

interface Props {
  checked: boolean;
  onChange: () => void;
  name: string;
  children: ReactNode;
}

const Checkbox = ({ checked, onChange, name, children }: Props) => {
  return (
    <div
      style={{
        marginRight: '.25em',
        marginBottom: '.25em',
        display: 'inline-block',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        name={name}
      />
      <label htmlFor={name} style={{ marginRight: '.25em' }}>
        {children}
      </label>
    </div>
  );
};

export default Checkbox;
