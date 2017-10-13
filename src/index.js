// @flow

import { string } from "./json";
import { decodeString } from "./decode";

(function() {
  const a = decodeString(string, '"hello world"');
  const b = decodeString(string, "42");

  console.log("expect decodeString to be Ok", a);
  console.log("expect decodeString to be Error", b);

  const matchedA = a.matchWith({
    Ok: ({ value }) => `Ok: ${value}`,
    Error: ({ value }) => `Error: ${value}`
  });

  const matchedB = b.matchWith({
    Ok: ({ value }) => `Ok: ${value}`,
    Error: ({ value }) => `Error: ${value}`
  });

  console.log("expect matchedA to be Ok", matchedA);
  console.log("expect matchedB to be Error", matchedB);
})();
