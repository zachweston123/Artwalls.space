/**
 * AdminConsole — dedicated admin layout with sidebar + page content.
 *
 * Extracted from App.tsx to keep the admin rendering self-contained.
 * This is rendered as an early-return in App.tsx when `currentUser.role === 'admin'`.
 */
import { Suspense } from 'react';
import type { User, NavigateFn } from '../types/app';
import {
  AdminSidebar,
  AdminDashboard,
  AdminWallProductivity,
  AdminUsers,
  AdminUserDetail,
  AdminAnnouncements,
  AdminPromoCodes,
  StripePaymentSetup,
  AdminActivityLog,
  AdminInvites,
  AdminReferrals,
  AdminSalesPage,
  AdminCurrentDisplays,
  AdminSupport,
  SupportInbox,
  SupportMessageDetail,
} from './lazyPages';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--blue)]" />
  </div>
);

export interface AdminConsoleProps {
  currentPage: string;
  currentUser: User;
  onNavigate: NavigateFn;
  onLogout: () => void;
  selectedMessageId: string | null;
  setSelectedMessageId: (id: string | null) => void;
}

export function AdminConsole({
  currentPage,
  currentUser,
  onNavigate,
  onLogout,
  selectedMessageId,
  setSelectedMessageId,
}: AdminConsoleProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <div className="flex min-h-screen">
        <AdminSidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
          onLogout={onLogout}
          userName={currentUser.name}
          userEmail={currentUser.email}
        />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-8 overflow-y-auto">
            {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={onNavigate} />}
            {currentPage === 'admin-wall-productivity' && <AdminWallProductivity onNavigate={onNavigate} />}
            {currentPage === 'admin-users' && (
              <AdminUsers onViewUser={(_userId) => onNavigate('admin-user-detail')} />
            )}
            {currentPage === 'admin-user-detail' && (
              <AdminUserDetail userId="1" onBack={() => onNavigate('admin-users')} />
            )}
            {currentPage === 'admin-announcements' && <AdminAnnouncements />}
            {currentPage === 'admin-promo-codes' && (
              <AdminPromoCodes />
            )}
            {currentPage === 'admin-stripe-payments' && <StripePaymentSetup onNavigate={onNavigate} />}
            {currentPage === 'admin-activity-log' && <AdminActivityLog />}
            {currentPage === 'admin-invites' && <AdminInvites />}
            {currentPage === 'admin-referrals' && <AdminReferrals />}
            {currentPage === 'admin-sales' && <AdminSalesPage />}
            {currentPage === 'admin-current-displays' && <AdminCurrentDisplays />}
            {currentPage === 'admin-support' && <AdminSupport />}
            {currentPage === 'admin-support-messages' && (
              <SupportInbox onSelectMessage={(messageId) => {
                setSelectedMessageId(messageId);
                onNavigate('admin-support-message-detail');
              }} />
            )}
            {currentPage === 'admin-support-message-detail' && selectedMessageId && (
              <SupportMessageDetail
                messageId={selectedMessageId}
                onBack={() => onNavigate('admin-support-messages')}
              />
            )}
          </main>
        </div>
      </div>
    </Suspense>
  );
}
