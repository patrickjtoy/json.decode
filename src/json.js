// @flow

// Vendor
import Maybe from "folktale/maybe";
import Result from "folktale/result";
import { List } from "immutable";

// A value that knows how to decode JSON values.
type Decoder<a> = {
  ctor: string,
  tag: string,
  msg: string,
  index: number,
  value: ?a,
  field: string,
  func: Function,
  decoder: Decoder<a>,
  decoders: List<Decoder<a>>,
  callback: <a>(value: a) => *
};

const decodePrimitive = (tag: string): $Shape<Decoder<string>> => ({
  ctor: "<decoder>",
  tag: tag
});

const string = decodePrimitive("string");

// DECODE HELPERS

const ok = <a>(value: a): $Shape<Decoder<a>> => ({ tag: "ok", value: value });

const badPrimitive = <a>(type: string, value: a) => ({
  tag: "primitive",
  type: type,
  value: value
});

const badIndex = <a>(
  index: number,
  nestedProblems: List<Result<string, a>>
) => ({
  tag: "index",
  index: index,
  rest: nestedProblems
});

const badField = <a>(
  field: string,
  nestedProblems: List<Result<string, a>>
) => ({ tag: "field", field: field, rest: nestedProblems });

const bad = (msg: string) => ({ tag: "fail", msg: msg });

const jsToString = value => {
  return value === undefined ? "undefined" : JSON.stringify(value);
};

const badToString = problem => {
  var context = "_";
  while (problem) {
    switch (problem.tag) {
      case "primitive":
        return (
          "Expecting " +
          problem.type +
          (context === "_" ? "" : " at " + context) +
          " but instead got: " +
          jsToString(problem.value)
        );

      case "index":
        context += "[" + problem.index + "]";
        problem = problem.rest;
        break;

      case "field":
        context += "." + problem.field;
        problem = problem.rest;
        break;

      case "oneOf":
        var problems = problem.problems;
        for (var i = 0; i < problems.length; i++) {
          problems[i] = badToString(problems[i]);
        }
        return (
          "I ran into the following problems" +
          (context === "_" ? "" : " at " + context) +
          ":\n\n" +
          problems.join("\n")
        );

      case "fail":
        return (
          "I ran into a `fail` decoder" +
          (context === "_" ? "" : " at " + context) +
          ": " +
          problem.msg
        );
    }
  }
};

// DECODE

const runHelp = <a>(decoder: Decoder<a>, value: a): Result<string, a> => {
  switch (decoder.tag) {
    case "bool":
      return typeof value === "boolean"
        ? ok(value)
        : badPrimitive("a Bool", value);

    case "int":
      if (typeof value !== "number") {
        return badPrimitive("an Int", value);
      }

      if (-2147483647 < value && value < 2147483647 && (value | 0) === value) {
        return ok(value);
      }

      if (isFinite(value) && !(value % 1)) {
        return ok(value);
      }

      return badPrimitive("an Int", value);

    case "float":
      return typeof value === "number"
        ? ok(value)
        : badPrimitive("a Float", value);

    case "string":
      return typeof value === "string"
        ? ok(value)
        : value instanceof String
          ? ok(value + "")
          : badPrimitive("a String", value);

    case "null":
      return value === null ? ok(decoder.value) : badPrimitive("null", value);

    case "value":
      return ok(value);

    case "list":
      if (!(value instanceof Array)) {
        return badPrimitive("a List", value);
      }

      var list = List();
      for (var i = value.length; i--; ) {
        var result = runHelp(decoder.decoder, value[i]);
        if (result.tag !== "ok") {
          return badIndex(i, result);
        }
        list = list.unshift(result.value);
      }
      return ok(list);

    case "array":
      if (!(value instanceof Array)) {
        return badPrimitive("an Array", value);
      }

      var len = value.length;
      var array = new Array(len);
      for (var i = len; i--; ) {
        var result = runHelp(decoder.decoder, value[i]);
        if (result.tag !== "ok") {
          return badIndex(i, result);
        }
        array[i] = result.value;
      }
      return ok(List(array));

    case "maybe":
      var result = runHelp(decoder.decoder, value);
      return result.tag === "ok"
        ? ok(Maybe.Just(result.value))
        : ok(Maybe.Nothing());

    case "field":
      var field = decoder.field;
      if (typeof value !== "object" || value === null || !(field in value)) {
        return badPrimitive(
          "an object with a field named `" + field + "`",
          value
        );
      }

      var result = runHelp(decoder.decoder, value[field]);
      return result.tag === "ok" ? result : badField(field, result);

    case "index":
      var index = decoder.index;
      if (!(value instanceof Array)) {
        return badPrimitive("an array", value);
      }
      if (index >= value.length) {
        return badPrimitive(
          "a longer array. Need index " +
            index +
            " but there are only " +
            value.length +
            " entries",
          value
        );
      }

      var result = runHelp(decoder.decoder, value[index]);
      return result.tag === "ok" ? result : badIndex(index, result);

    case "key-value":
      if (
        typeof value !== "object" ||
        value === null ||
        value instanceof Array
      ) {
        return badPrimitive("an object", value);
      }

      var keyValuePairs = List();
      for (var key in value) {
        var result = runHelp(decoder.decoder, value[key]);
        if (result.tag !== "ok") {
          return badField(key, result);
        }
        var pair = List([key, result.value]);
        keyValuePairs = keyValuePairs.unshift(pair);
      }
      return ok(keyValuePairs);

    case "map-many":
      var answer = decoder.func;
      var decoders = decoder.decoders;
      for (var i = 0; i < decoders.size; i++) {
        var result = runHelp(decoders.get(i), value);
        if (result.tag !== "ok") {
          return result;
        }
        answer = answer(result.value);
      }
      return ok(answer);

    case "andThen":
      var result = runHelp(decoder.decoder, value);
      return result.tag !== "ok"
        ? result
        : runHelp(decoder.callback(result.value), value);

    case "fail":
      return bad(decoder.msg);

    case "succeed":
      return ok(decoder.msg);
  }
};

const run = <a>(decoder: Decoder<a>, value: a) => {
  let result = runHelp(decoder, value);
  return result.tag === "ok"
    ? Result.Ok(result.value)
    : Result.Error(badToString(result));
};

const runOnString = <a>(decoder: Decoder<a>, string: string) => {
  let json;
  try {
    json = JSON.parse(string);
  } catch (e) {
    return Result.Error("Given an invalid JSON: " + e.message);
  }
  return run(decoder, json);
};

export { runOnString, string };
