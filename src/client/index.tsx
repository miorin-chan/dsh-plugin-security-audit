import { useEffect, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { BundleInfo } from '@deepseek-ai/dsh-plugin-manager/types'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { PluginDetailProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-plugin-manager/remote'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { auditPrompt, catalogTarget, registryTarget, type UpdateTarget } from '../lib/update.js'

const namespace = 'dsh-plugin-security-audit'
const labels = {
  en: { audit: 'Audit update', retry: 'Retry audit lookup' },
  zh: { audit: '审计更新', retry: '重试查找审计版本' },
  ja: { audit: '更新を監査', retry: '監査対象を再確認' },
  de: { audit: 'Update prüfen', retry: 'Prüfversion erneut suchen' },
  es: { audit: 'Auditar actualización', retry: 'Reintentar búsqueda para auditoría' },
  fr: { audit: 'Auditer la mise à jour', retry: 'Relancer la recherche pour l’audit' },
  pt: { audit: 'Auditar atualização', retry: 'Repetir busca para auditoria' },
  ru: { audit: 'Проверить обновление', retry: 'Повторить поиск версии для аудита' },
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'dsh-plugin-security-audit': keyof typeof labels.en
  }
}

export const inject = ['locale', 'slots', 'uiWorkspace', 'remote', 'remote.pluginManager']

type DetailActionProps = PluginDetailProps & PropsLocale<typeof namespace>
  & Pick<PropsRuntime<'plugins.detail.actions'>, 'useRemoteAccess'>

type Lookup = { targets: UpdateTarget[]; failed?: boolean }

async function readTargets(remote: ClientRemote['pluginManager'], name: string, version: string,
  canReadVersions: boolean, signal: AbortSignal): Promise<Lookup> {
  const result = await remote.listBundles()
  if (!result.ok || signal.aborted) return { targets: [], failed: !result.ok }
  const bundle = result.value.find((entry: BundleInfo) => entry.name === name && entry.version === version)
  if (bundle === undefined) return { targets: [] }
  const catalog = catalogTarget(bundle)
  const targets = catalog === undefined ? [] : [catalog]
  if (bundle.update !== 'registry' || !canReadVersions) return { targets }
  const versions = await remote.listVersions(name, {}, signal)
  if (!versions.ok || versions.value.status === 'refused') return { targets, failed: true }
  const registry = registryTarget(bundle, versions.value)
  if (registry !== undefined && registry.to !== catalog?.to) targets.push(registry)
  return { targets }
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(namespace, labels), `${namespace}: dictionaries`)

  function AuditAction({ subject, t, useRemoteAccess }: DetailActionProps) {
    const canReadBundles = useRemoteAccess('pluginManager/listBundles')
    const canReadVersions = useRemoteAccess('pluginManager/listVersions')
    const bundle = subject.kind === 'bundle' && subject.pkg.installed ? subject.pkg : undefined
    const name = bundle?.name
    const version = bundle?.version
    const [revision, setRevision] = useState(0)
    const [loaded, setLoaded] = useState<Lookup & { name: string; version: string; revision: number }>()
    const refresh = () => setRevision(value => value + 1)

    useEffect(() => {
      if (!canReadBundles || name === undefined || version === undefined) return
      const request = new AbortController()
      const complete = (result: Lookup) => {
        if (!request.signal.aborted) setLoaded({ ...result, name, version, revision })
      }
      void readTargets(ctx.remote.pluginManager, name, version, canReadVersions, request.signal).then(
        complete, () => complete({ targets: [], failed: true }),
      )
      const unsubscribe = ctx.remote.$on('plugin-manager/changed', refresh)
      return () => { request.abort(); unsubscribe() }
    }, [canReadBundles, canReadVersions, name, version, revision])

    if (!canReadBundles || loaded === undefined || loaded.name !== name || loaded.version !== version
      || loaded.revision !== revision) return null
    const buttons = loaded.targets.filter(target => target.kind !== 'registry' || canReadVersions).map(target => (
      <button key={`${target.kind}:${target.to}`} type="button" className={`${namespace}-button`}
        onClick={() => {
          const draft = { prompt: auditPrompt(target, ctx.locale.getLocale().active), whenDraftExists: 'append' } as const
          ctx.uiWorkspace.startSession(undefined, draft)
        }}>
        {t('audit')} {target.to}
      </button>
    ))
    if (loaded.failed && canReadVersions) buttons.push(
      <button key="retry" type="button" className={`${namespace}-button`} onClick={refresh}>{t('retry')}</button>,
    )
    return buttons
  }

  ctx.effect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .${namespace}-button {
        min-height: 28px; padding: 3px 9px; border-radius: 8px; cursor: pointer;
        font: inherit; font-size: 12px; white-space: nowrap;
        color: var(--dsw-alias-label-primary); background: transparent;
        border: 1px solid var(--dsw-alias-border-l3);
      }
      .${namespace}-button:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .${namespace}-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
    `
    document.head.append(style)
    return () => style.remove()
  }, `${namespace}: styles`)

  ctx.slots.inject('plugins.detail.actions', () => ctx.slots.register({
    name: 'plugins.detail.actions', id: namespace, locale: namespace,
  }, AuditAction))
}
