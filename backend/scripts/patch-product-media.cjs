const fs = require('node:fs')
const path = require('node:path')
const { maxImages } = require('../src/config/product-media.json')
if (!Number.isSafeInteger(maxImages) || maxImages < 1) throw new Error('Invalid product image limit')
const dist = path.join(__dirname, '../node_modules/@medusajs/dashboard/dist')
let matched = 0
for (const name of fs.readdirSync(dist).filter(name => name.endsWith('.mjs'))) {
  const file = path.join(dist, name)
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('var UploadMediaFormItem =')) continue
  matched++
  const original = 'files?.forEach((f) => append({ ...f, isThumbnail: false }));'
  source = source.replace(/\/\* PRODUCT_MEDIA_LIMIT_START \*\/[\s\S]*?\/\* PRODUCT_MEDIA_LIMIT_END \*\//g, original)
  if (!source.includes(original)) throw new Error('Media uploader patch target changed')
  source = source.replace(original, `/* PRODUCT_MEDIA_LIMIT_START */
      if ((form.getValues("media") || []).length + files.length > ${maxImages}) {
        form.setError("media", { type: "max", message: "Upload up to ${maxImages} product images." });
        return;
      }
      files?.forEach((f) => append({ ...f, isThumbnail: false }));
      /* PRODUCT_MEDIA_LIMIT_END */`)
  source = source.replace(/hint: (?:t\("products.media.uploadImagesHint"\)|"Select or drag up to \d+ images\."),/g, `hint: "Select or drag up to ${maxImages} images.",`)
  // Retain the thumbnail in the gallery; the storefront deduplicates URLs.
  source = source.replace('values.media?.filter((media) => !media.isThumbnail).map((media) => ({ url: media.url }))', 'values.media?.map((media) => ({ url: media.url }))')
  fs.writeFileSync(file, source)
}
if (!matched) throw new Error('Product media uploader module was not found')
