import { useNumericInput } from '@utils/numberUtils';

export default function NumericInput(props) {
  const inputProps = useNumericInput(
    props.value,
    props.onChange,
    props.decimals
  );

  return <input {...inputProps} {...props} />;
}
