import toolManager from './tool-manager.service.mjs'

export default (dependencies) => {
  const { toolManager: tm } = { toolManager, ...(dependencies || {}) }

  async function seedCuratedTools({ preset = 'core' }) {
    const sets = {
      core: [
        { packageName: 'lodash', version: 'latest', functionName: 'default', schema: { name: 'npm_lodash_default', description: 'lodash default wrapper', parameters: { type: 'object', properties: {}, additionalProperties: true } }, invokeTemplate: 'return typeof fn==="function"?fn(args):fn' },
        { packageName: 'pdf-parse', version: 'latest', functionName: 'default', schema: { name: 'npm_pdf_parse_default', description: 'pdf-parse default wrapper', parameters: { type: 'object', properties: { data: { type: 'string' } }, required: ['data'], additionalProperties: true } }, initCode: '', invokeTemplate: 'return fn(args.data || "")' },
        { packageName: 'markdown-it', version: 'latest', functionName: 'default', schema: { name: 'npm_markdown_it_default', description: 'markdown-it default wrapper', parameters: { type: 'object', properties: { markdown: { type: 'string' } }, required: ['markdown'], additionalProperties: true } }, initCode: 'const MD = mod.default || mod', invokeTemplate: 'const parser = typeof MD==="function"?MD():MD; return parser.render(args.markdown||"")' },
        { packageName: 'node-html-parser', version: 'latest', functionName: 'parse', schema: { name: 'npm_node_html_parser_parse', description: 'HTML parse wrapper', parameters: { type: 'object', properties: { html: { type: 'string' } }, required: ['html'], additionalProperties: true } }, invokeTemplate: 'return fn(args.html||"")' },
        { packageName: 'axios', version: 'latest', functionName: 'default', schema: { name: 'npm_axios_default', description: 'axios request wrapper', parameters: { type: 'object', properties: { url: { type: 'string' }, config: { type: 'object' } }, required: ['url'], additionalProperties: true } }, invokeTemplate: 'return fn(args.url, args.config||{})' },
        { packageName: 'csv-parse', version: 'latest', functionName: 'parse', schema: { name: 'npm_csv_parse_parse', description: 'csv parse wrapper', parameters: { type: 'object', properties: { data: { type: 'string' }, options: { type: 'object' } }, required: ['data'], additionalProperties: true } }, invokeTemplate: 'return fn(args.data, args.options||{})' },
        { packageName: 'yaml', version: 'latest', functionName: 'parse', schema: { name: 'npm_yaml_parse', description: 'yaml parse', parameters: { type: 'object', properties: { data: { type: 'string' } }, required: ['data'], additionalProperties: true } }, invokeTemplate: 'return fn(args.data||"")' },
        { packageName: 'cheerio', version: 'latest', functionName: 'load', schema: { name: 'npm_cheerio_load', description: 'Cheerio HTML loader', parameters: { type: 'object', properties: { html: { type: 'string' } }, required: ['html'], additionalProperties: true } }, invokeTemplate: 'const $ = fn(args.html); return $.html ? { html: $.html() } : { ok: true }' },
        { packageName: 'fast-xml-parser', version: 'latest', functionName: 'XMLParser', schema: { name: 'npm_fast_xml_parser_XMLParser', description: 'Fast XML Parser', parameters: { type: 'object', properties: { xml: { type: 'string' }, options: { type: 'object' } }, required: ['xml'], additionalProperties: true } }, invokeTemplate: 'const parser = new fn(args.options||{}); return parser.parse(args.xml)' },
        { packageName: 'dayjs', version: 'latest', functionName: 'default', schema: { name: 'npm_dayjs_default', description: 'Day.js date utility', parameters: { type: 'object', properties: { input: { type: 'string' }, format: { type: 'string' } }, additionalProperties: true } }, invokeTemplate: 'const d = fn(args.input); return args.format? d.format(args.format) : d.toISOString()' },
        { packageName: 'uuid', version: 'latest', functionName: 'v4', schema: { name: 'npm_uuid_v4', description: 'UUID v4 generator', parameters: { type: 'object', properties: {} } }, invokeTemplate: 'return fn()' },
        { packageName: 'csv-stringify', version: 'latest', functionName: 'stringify', schema: { name: 'npm_csv_stringify', description: 'CSV stringify', parameters: { type: 'object', properties: { records: { type: 'array' }, options: { type: 'object' } }, required: ['records'] } }, invokeTemplate: 'return new Promise((resolve,reject)=>fn(args.records,args.options||{},(err,out)=>err?reject(err):resolve(out)))' },
        { packageName: 'json5', version: 'latest', functionName: 'parse', schema: { name: 'npm_json5_parse', description: 'JSON5 parse', parameters: { type: 'object', properties: { data: { type: 'string' } }, required: ['data'] } }, invokeTemplate: 'return fn(args.data)' },
        { packageName: 'semver', version: 'latest', functionName: 'valid', schema: { name: 'npm_semver_valid', description: 'Semver validate', parameters: { type: 'object', properties: { version: { type: 'string' } }, required: ['version'] } }, invokeTemplate: 'return fn(args.version)' }
      ]
    }
    const items = sets[preset] || []
    const res = await tm.execute('registerBulkNpmTools', { items })
    return res
  }
  seedCuratedTools.metadata = {
    name: 'seedCuratedTools',
    description: 'Seed curated npm tool wrappers for immediate availability',
    parameters: { type: 'object', properties: { preset: { type: 'string' } } }
  }

  return { seedCuratedTools }
}
