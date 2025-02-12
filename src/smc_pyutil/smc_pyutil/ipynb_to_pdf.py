#!/usr/bin/python
# -*- coding: utf-8 -*-

# This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
# License: AGPLv3 s.t. "Commons Clause" – read LICENSE.md for details
"""
Convert ipynb files to pdf using nbconvert's html generating
and headless chromium, instead of using LaTeX.  This is much
faster and more reliable, but potentially doesn't "look" as good,
depending on your tastes.  It also has a dependency on chromium.
"""

# ATTN: make sure to keep dependencies of this in sync with smc-project/configuration.ts

from __future__ import absolute_import, print_function
from shutil import which
import os, sys, time, glob
from subprocess import check_call
from itertools import repeat, chain


def sanitize_nbconvert_path(path):
    # same functionality as in smc-util/sanitize-nbconvert.ts
    # https://github.com/jupyter/nbconvert/issues/911
    return glob.escape(path)


def ipynb_to_pdf(path):
    t = time.time()
    print("-" * 70)
    print("Convert %s..." % path)
    if not path.endswith('.ipynb'):
        err = "every path must end in '.ipynb' but '%s' does not" % path
        raise ValueError(err)

    browser = None
    if which("chromium-browser") is not None:
        browser = "chromium-browser"
    elif which("google-chrome") is not None:
        browser = "google-chrome"
    else:
        raise Exception("Neither Chrome nor Chromium installed!")
    print(f"using {browser} to convert to PDF")

    path = os.path.abspath(path)
    base = path[:-len('ipynb')]
    pdf = base + 'pdf'
    html = base + 'tmp.html'
    check_call([
        "jupyter",
        "nbconvert",
        sanitize_nbconvert_path(path),
        "--to",
        "html",
        "--output=%s" % html,
    ])
    # --no-sandbox so it works in cocalc-docker (see https://stackoverflow.com/questions/43665276/how-to-run-google-chrome-headless-in-docker); should be OK, given our security model...
    check_call([
        browser,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--print-to-pdf=%s" % pdf,
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=10000",
        html,
    ])
    os.unlink(html)
    print("Converted %s to %s in %s seconds" % (path, pdf, time.time() - t))
    print("-" * 70)


def main():
    if len(sys.argv) == 1:
        print("Usage: cc-ipynb-to-pdf [filename1.ipynb] [filename2.ipynb] ...")
        print(
            "Converts filename1.ipynb to filename1.pdf, etc., using nbconvert first"
        )
        print(
            "to convert to HTML, then using headless chromium to convert that to PDF."
        )
        print(
            "This is *vastly* more robust and faster than  using nbconvert directly,"
        )
        print("since that uses LaTeX.")
    else:
        for path in sys.argv[1:]:
            ipynb_to_pdf(path)


if __name__ == "__main__":
    main()
