// Read https://raw.githubusercontent.com/spdx/license-list-data/master/json/licenses.json
// Transform to only contain licenseIds in an array
// Save to ../spdx-licenses.json

const fs = require('fs');

const licensesUrl = 'https://raw.githubusercontent.com/spdx/license-list-data/master/json/licenses.json';

const saveUpdated = async () => {
  const response = await fetch(licensesUrl);
  const data = await response.json();
  const filepath = __dirname + '\\..\\spdx-licenses.json';
  const licenseIdList = data.licenses.map(x => x.licenseId).sort();
  fs.writeFileSync(filepath, JSON.stringify(licenseIdList, null, 2));
}

saveUpdated();