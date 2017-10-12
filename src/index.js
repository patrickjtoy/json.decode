// Vendor
import { create, env } from 'sanctuary';
import { Result } from 'folktale';

const S = create({ checkTypes: process.env.NODE_ENV !== 'production', env });

// A value that knows how to decode JSON values.
type Decoder<a> = string => {
  isValid: () => boolean,
  parse: () => a
};

const string: Decoder<string> = (value: string) => ({
  isValid: () => S.is(String),
  parse: () => value.toString()
});
// const number: Decoder<number> = () => {};
// const boolean: Decoder<boolean> = () => {};

// decodeString : Decoder a -> string -> Result string a
const decodeString = <a>(
  decoder: Decoder<a>,
  value: string
): Result<string, a> => {
  const _decoder = decoder(value);

  _decoder.isValid()
    ? Result.Ok(_decoder.parse())
    : Result.Error(
        `Expecting a ${decoder.name}, but instead got: ${typeof value}`
      );
};
