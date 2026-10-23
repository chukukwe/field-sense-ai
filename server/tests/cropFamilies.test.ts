import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cropOptions, normalizeCustomCropName, validateCropSelection } from '../../src/data/cropFamilies.js';

describe('crop names and families', () => {
  it('uses maintained family labels and identifies mixed vegetable families', () => {
    assert.equal(cropOptions.find((crop) => crop.type === 'Cassava')?.family, 'Euphorbiaceae family');
    assert.equal(cropOptions.find((crop) => crop.type === 'Maize')?.family, 'Grass family (Poaceae)');
    assert.match(cropOptions.find((crop) => crop.type === 'Vegetables')?.family ?? '', /Several plant families/);
    assert.equal(cropOptions.find((crop) => crop.type === 'Other')?.label, 'Others');
  });

  it('trims and validates a custom crop name', () => {
    assert.equal(normalizeCustomCropName('  Sweet   potato '), 'Sweet potato');
    assert.equal(normalizeCustomCropName('  '), null);
    assert.equal(normalizeCustomCropName('<script>'), null);
    assert.equal(normalizeCustomCropName('a'.repeat(81)), null);
  });

  it('reports a missing crop separately from a missing or invalid custom crop name', () => {
    assert.equal(validateCropSelection(null, ''), 'crop-required');
    assert.equal(validateCropSelection('Other', '  '), 'custom-name-required');
    assert.equal(validateCropSelection('Other', '<crop>'), 'custom-name-invalid');
    assert.equal(validateCropSelection('Other', 'Sweet potato'), null);
    assert.equal(validateCropSelection('Cassava', ''), null);
  });
});
