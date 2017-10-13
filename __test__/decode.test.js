// @flow

import Result from "folktale/result";
import { string } from "src/json";
import { decodeString } from "src/decode";

test("decodes a valid string from JSON", () => {
  expect(decodeString(string, '"hello world"')).toEqual(
    Result.Ok("hello world")
  );
});

test("decodes an invalid string from JSON", () => {
  expect(decodeString(string, "42")).toEqual(
    Result.Error("Expecting a String but instead got: 42")
  );
});
