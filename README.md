CycloneDX Bower managed dependencies generator
=========

The CycloneDX Bower generator is derived from the
[CycloneDX Node.js Module](https://github.com/CycloneDX/cyclonedx-node-module),
which deserves all credit. Before this module was created,
[a question was asked the CycloneDX Node.js Module team](https://github.com/CycloneDX/cyclonedx-node-module/issues/35)
whether they would be interested in adding Bower support in their module. This
module is mostly an experiment to figure out how much I would need to add in
order to add support in the official Node.js Module.

While the roadmap for this project is to create a `read_installed` module for
bower packages and then incorporate this in the official Node.js Module, this
utility is useful in its current form to a number of projects.

The CycloneDX module for Bower creates a valid CycloneDX Software
Bill-of-Materials (SBOM) containing an aggregate of all bower project
dependencies. CycloneDX is a lightweight SBOM specification that is easily
created, human and machine readable, and simple to parse.

Requirements
-------------------
1) Node.js v8.0.0 or higher
2) `bower install` has been executed for the target repository

Usage
-------------------

#### Installing

```bash
npm install -g cdx-bower-bom
```

#### Getting Help
```bash
$ cdx-bower-bom -h
Usage:  cdx-bower-bom [OPTIONS] [path]
Options:
  -h        - this help
  -a <path> - merge in additional modules from other scanner
  -o <path> - write to file instead of stdout
  -ns       - do not generate bom serial number
  --version - print version number
```

#### Example
```bash
cdx-bower-bom -o bom.xml
```

License
-------------------

Permission to modify and redistribute is granted under the terms of the Apache 2.0 license.
