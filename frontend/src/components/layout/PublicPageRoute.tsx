import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from './Navbar'
import FooterLight from './FooterLight'
import PublicMaintenanceScreen from './PublicMaintenanceScreen'
import { useMaintenance } from '../../context/MaintenanceContext'
import { useAuth } from '../../context/AuthContext'
import { useMaintenancePreviewEnabled } from '../../lib/maintenance-preview'
import type { MaintenancePageKey } from '../../../../backend/src/types/shared'

interface PublicPageRouteProps {
  page: MaintenancePageKey
  children: ReactNode
}

export default function PublicPageRoute({ page, children }: PublicPageRouteProps) {
  const { t } = useTranslation()
  const { pages } = useMaintenance()
  const { permissions, isLoading } = useAuth()
  const previewEnabled = useMaintenancePreviewEnabled()
  const canPreviewMaintenance = previewEnabled && !isLoading && permissions.includes('maintenance.manage')

  if (previewEnabled && isLoading) {
    return null
  }

  if (canPreviewMaintenance) {
    if (page === 'home') {
      return <>{children}</>
    }

    return (
      <>
        <Navbar variant="light" />
        {children}
        <FooterLight />
      </>
    )
  }

  if (pages.home.enabled) {
    return (
      <PublicMaintenanceScreen
        variant="dark"
        message={t('maintenance.home')}
        showHeadline
        showReservedAreaButton
      />
    )
  }

  if (page !== 'home' && pages[page].enabled) {
    return (
      <>
        <Navbar variant="light" />
        <PublicMaintenanceScreen variant="light" message={t(`maintenance.${page}`)} />
        <FooterLight />
      </>
    )
  }

  if (page === 'home') {
    return <>{children}</>
  }

  return (
    <>
      <Navbar variant="light" />
      {children}
      <FooterLight />
    </>
  )
}
