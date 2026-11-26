import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditPrompt, catalogTarget, registryTarget } from '../lib/update.js'

const bundle = { name: '@example/plugin', version: '1.0.0', installed: true, removable: true, availability: 'profile' }

test('catalog updates use the advertised spec, including source changes at the same version', () => {
  const installed = { ...bundle, source: 'link:/old', installTarget: { spec: 'link:/new', version: '1.0.0' } }
  const target = catalogTarget(installed)
  assert.equal(target.spec, 'link:/new')
  assert.match(auditPrompt(target, 'en'), /"spec":"link:\/new"/)
  assert.equal(catalogTarget({ ...installed, source: 'link:/new' }), undefined)
  assert.equal(catalogTarget({ ...installed, removable: false }), undefined)
})

test('registry updates require the current installed version and omit URL credentials', () => {
  const registryBundle = { ...bundle, update: 'registry' }
  const list = {
    status: 'listed', installed: '1.0.0', registry: 'https://user:secret@registry.example/npm?token=secret#secret',
    versions: [
      { version: '4.0.0', bundle: true, incompatible: {} },
      { version: '3.0.0', bundle: true, deprecated: 'obsolete' },
      { version: '2.0.0', bundle: true },
    ],
  }
  const target = registryTarget(registryBundle, list)
  const draft = auditPrompt(target, 'en')
  assert.match(draft, /"spec":"@example\/plugin@2.0.0"/)
  assert.match(draft, /"registry":"https:\/\/registry.example\/npm"/)
  assert.doesNotMatch(draft, /secret/)
  assert.equal(registryTarget(registryBundle, { ...list, installed: '0.1.0' }), undefined)
  assert.equal(registryTarget(registryBundle, { ...list, versions: list.versions.slice(0, 2) }), undefined)
})

test('auditPrompt matches regional Chinese locale codes and falls back to English', () => {
  const target = { kind: 'catalog', name: '@example/plugin', from: '1.0.0', to: '1.1.0', spec: 'link:/plugin' } as const
  for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh_Hans']) {
    assert.match(auditPrompt(target, locale), /防御性的代码安全审计/)
  }
  for (const locale of ['en', 'ja']) {
    assert.match(auditPrompt(target, locale), /Perform a defensive code security review/)
  }
})
