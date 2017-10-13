// @flow

import { create, env } from "sanctuary";
import { runOnString } from "./json";

const S = create({ checkTypes: process.env.NODE_ENV !== "production", env });

// RUN DECODERS

const decodeString = runOnString;

export { decodeString, S };
