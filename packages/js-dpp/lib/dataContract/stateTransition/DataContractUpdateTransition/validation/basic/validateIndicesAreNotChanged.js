const lodashGet = require('lodash.get');
const DataContractIndicesChangedError = require('../../../../../errors/consensus/basic/dataContract/DataContractIndicesChangedError');

const serializer = require('../../../../../util/serializer');

const ValidationResult = require('../../../../../validation/ValidationResult');

/**
 * Validate indices have not been changed
 *
 * @param {Object} oldDocuments
 * @param {Object} newDocuments
 *
 * @returns {ValidationResult}
 */
function validateIndicesAreNotChanged(oldDocuments, newDocuments) {
  const result = new ValidationResult();

  // Check that old index dinfitions are intact
  const changedDocumentEntry = Object.entries(oldDocuments)
    .find(([documentType, oldSchema]) => {
      const path = `${documentType}.indices`;

      const newSchemaIndices = lodashGet(newDocuments, path);

      return !serializer.encode(oldSchema.indices).equals(serializer.encode(newSchemaIndices));
    });

  const [documentType] = changedDocumentEntry || [];

  if (documentType) {
    result.addError(new DataContractIndicesChangedError(documentType));
  }

  return result;
}

module.exports = validateIndicesAreNotChanged;
