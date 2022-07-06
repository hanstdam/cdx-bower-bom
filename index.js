const builder = require('xmlbuilder');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs')
const path = require('path')
const PackageURL = require('packageurl-js');
const glob = require('glob');
const parsePackageJsonName = require('parse-packagejson-name');
const spdxLicenses = require('./spdx-licenses.json');

/**
 * Performs a lookup + validation of the license specified in the
 * package. If the license is a valid SPDX license ID, set the 'id'
 * of the license object, otherwise, set the 'name' of the license
 * object.
 */
function getLicenses(pkg) {
  let license = pkg.license && (pkg.license.type || pkg.license);
  if (license) {
      if (!Array.isArray(license)) {
          license = [license];
      }
      return license.map(l => {
          if (! (typeof l === 'string' || l instanceof String)) {
              console.error("Invalid license definition in package: " + pkg.name + ":" + pkg.version + ". Skipping");
              return null;
          }
          let licenseContent = {};
          if (spdxLicenses.some(v => { return l === v; })) {
              licenseContent.id = l;
          } else {
              licenseContent.name = l;
          }
          addLicenseText(pkg, l, licenseContent);
          return licenseContent;
      }).map(l => ({license: l}));
  }
  return null;
}

/**
 * Tries to find a file containing the license text based on commonly
 * used naming and content types. If a candidate file is found, add
 * the text to the license text object and stop.
 */
function addLicenseText(pkg, l, licenseContent) {
  let licenseFilenames = [ 'LICENSE', 'License', 'license', 'LICENCE', 'Licence', 'licence', 'NOTICE', 'Notice', 'notice' ];
  let licenseContentTypes = { 'text/plain': '', 'text/txt': '.txt', 'text/markdown': '.md', 'text/xml': '.xml' };
  /* Loops over different name combinations starting from the license specified
     naming (e.g., 'LICENSE.Apache-2.0') and proceeding towards more generic names. */
  for (const licenseName of [`.${l}`, '']) {
      for (const licenseFilename of licenseFilenames) {
          for (const [licenseContentType, fileExtension] of Object.entries(licenseContentTypes)) {
              let licenseFilepath = `${pkg.realPath}/${licenseFilename}${licenseName}${fileExtension}`;
              if (fs.existsSync(licenseFilepath)) {
                  licenseContent.text = readLicenseText(licenseFilepath, licenseContentType);
                  return;
              }
          }
      }
  }
}

/**
 * Read the file from the given path to the license text object and includes
 * content-type attribute, if not default. Returns the license text object.
 */
function readLicenseText(licenseFilepath, licenseContentType) {
  let licenseText = fs.readFileSync(licenseFilepath, 'utf8');
  if (licenseText) {
      let licenseContentText = { '#cdata' : licenseText };
      if (licenseContentType !== 'text/plain') {
          licenseContentText['@content-type'] = licenseContentType;
      }
      return licenseContentText;
  }
  return null;
}

/**
 * If the author has described the module as a 'framework', the take their
 * word for it, otherwise, identify the module as a 'library'.
 */
function determinePackageType(pkg) {
  if (pkg.hasOwnProperty('keywords')) {
      for (keyword of pkg.keywords) {
          if (keyword.toLowerCase() === 'framework') {
              return 'framework';
          }
      }
  }
  return 'library';
}

/**
 * Builds external references url object
 * @param pkg
 * @returns {Array}
 */
function addExternalReferences(pkg) {
  let externalReferences = [];
  if (pkg.homepage) {
      externalReferences.push({'reference': {'@type': 'website', url: pkg.homepage}});
  }
  if (pkg.bugs && pkg.bugs.url) {
      externalReferences.push({'reference': {'@type': 'issue-tracker', url: pkg.bugs.url}});
  }
  if (pkg.repository && pkg.repository.url) {
      externalReferences.push({'reference': {'@type': 'vcs', url: pkg.repository.url}});
  }
  return externalReferences;
}

function readInstalled(root, options, callback) {
  let components = {}
  let bowerInstallFolders = ['components', 'bower_components'];
  const bowerrcPath = path.join(root, '.bowerrc')
  if (fs.existsSync(bowerrcPath)) {
    const bowerrcString = fs.readFileSync(bowerrcPath);
    const bowerrc = JSON.parse(bowerrcString);
    if (bowerrc.directory) {
      bowerInstallFolders = [ bowerrc.directory ];
    }
  }

  for (let i = 0; i < bowerInstallFolders.length; i++) {
    const componentsFolder = path.join(root, bowerInstallFolders[i])

    if (!fs.existsSync(componentsFolder)) {
      continue
    }

    let files = glob.sync(componentsFolder + "/**/.bower.json")

    for (let i = 0; i < files.length; i++) {
      const bowerString = fs.readFileSync(files[i]);
      const bower = JSON.parse(bowerString);
      bower.realPath = path.dirname(files[i]);

      let licenses = getLicenses(bower);
      let pkgIdentifier = parsePackageJsonName(bower.name)
      let group = pkgIdentifier.scope;
      let name = pkgIdentifier.fullName;
      let purl = new PackageURL('bower', group, bower.name, bower.version || bower['_release'], null, null);
      let purlString = purl.toString();

      let component = {
        '@type': determinePackageType(bower),
        group: group,
        name: name,
        version: bower.version || bower['_release'],
        description: { '#cdata' : bower.description },
        externalReferences : addExternalReferences(bower),
        licenses: licenses,
        purl: purlString
      }

      if (component.externalReferences === undefined || component.externalReferences.length === 0) {
        delete component.externalReferences;
      }

      console.log(component.purl)
      if (!component.purl) {
        continue
      }

      components[component.purl] = component
    }
  }

  callback(null, Object.keys(components).map(k => ({ component: components[k] })))
}

exports.createbom = (includeBomSerialNumber, root, options, callback) => readInstalled(root, options, (err, packages) => {
  let bom = builder.create('bom', { encoding: 'utf-8', separateArrayItems: true })
    .att('xmlns', 'http://cyclonedx.org/schema/bom/1.1');

  if (includeBomSerialNumber) {
    bom.att('serialNumber', 'urn:uuid:' + uuidv4());
  }

  bom.att('version', 1);
  bom.ele('components').ele(packages);

  let bomString = bom.end({
      pretty: true,
      indent: '  ',
      newline: '\n',
      width: 0,
      allowEmpty: false,
      spacebeforeslash: ''
  });

  callback(null, bomString);
});
