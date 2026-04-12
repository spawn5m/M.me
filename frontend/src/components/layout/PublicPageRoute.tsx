import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from './Navbar'
import FooterLight from './FooterLight'
import PublicMaintenanceScreen from './PublicMaintenanceScreen'
import { useMaintenance } from '../../context/MaintenanceContext'
import type { MaintenancePageKey } from '../../../../backend/src/types/shared'

interface PublicPageRouteProps {
  page: MaintenancePageKey
  children: ReactNode
}

export default function PublicPageRoute({ page, children }: PublicPageRouteProps) {
  const { t } = useTranslation()
  const { pages } = useMaintenance()

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
