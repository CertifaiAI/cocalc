// Load various scripts from the server.

import * as React from "react";
import { Helmet } from "react-helmet";

export default function LoadScripts() {
  return (
    <Helmet>
      <script src={`${BASE_URL}/customize?type=full`} type="text/javascript" />
    </Helmet>
  );
}