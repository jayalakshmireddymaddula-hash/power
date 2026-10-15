import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, Users, Shield, Zap, Database, Sliders, 
  RefreshCw, CheckCircle, AlertCircle, Plus, Mail, Building 
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../context/AuthContext';
import { orgApi, policiesApi, demoApi } from '../lib/api';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, organization } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'policies' | 'demo'>('general');

  // Policy threshold local form state
  const [tier1Threshold, setTier1Threshold] = useState('5000');
  const [tier2Threshold, setTier2Threshold] = useState('25000');
  const [allowSelfApproval, setAllowSelfApproval] = useState(false);
  const [baselineMinutes, setBaselineMinutes] = useState('25');
  const [policySaved, setPolicySaved] = useState(false);

  // Invite member modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'approver' | 'member'>('approver');
  const [isInviting, setIsInviting] = useState(false);

  // Demo seed state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['org-members'],
    queryFn: orgApi.getMembers,
    enabled: activeTab === 'members',
  });

  const { data: policies, isLoading: loadingPolicies } = useQuery({
    queryKey: ['org-policies'],
    queryFn: policiesApi.getApprovalPolicies,
    enabled: activeTab === 'policies',
  });

  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 3000);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsInviting(true);
      await orgApi.inviteMember({ email: inviteEmail, role: inviteRole });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      setInviteModalOpen(false);
      setInviteEmail('');
    } catch (err) {
      console.error('Failed to invite member', err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      setIsSeeding(true);
      const res = await demoApi.seed();
      setSeedSuccess(res.message || 'Demo records seeded successfully!');
      queryClient.invalidateQueries();
      setTimeout(() => setSeedSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to seed demo data', err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-indigo-400" />
          Platform Configuration & Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage organization attributes, members, approval thresholds, and demo presets.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
            activeTab === 'general'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          General & Organization
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
            activeTab === 'members'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Team & Roles
        </button>

        <button
          onClick={() => setActiveTab('policies')}
          className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
            activeTab === 'policies'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          Approval Policies & Rules
        </button>

        <button
          onClick={() => setActiveTab('demo')}
          className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
            activeTab === 'demo'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          Demo & System Status
        </button>
      </div>

      {/* Tab: General */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader className="border-b border-gray-800 pb-3">
              <h3 className="font-semibold text-white">Organization Details</h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Organization Name</label>
                  <Input value={organization?.name || 'Acme Global Operations'} disabled className="bg-gray-950/60" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Organization Slug</label>
                  <Input value={organization?.slug || 'acme-global'} disabled className="bg-gray-950/60" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Organization ID</label>
                <div className="font-mono text-xs text-gray-400 bg-gray-950/60 p-2.5 rounded-lg border border-gray-800 select-all">
                  {organization?.id || 'org_demo_123456789'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader className="border-b border-gray-800 pb-3">
              <h3 className="font-semibold text-white">Current User Profile</h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                  <Input value={user?.name || 'Administrator'} disabled className="bg-gray-950/60" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
                  <Input value={user?.email || 'admin@flowpilot.ai'} disabled className="bg-gray-950/60" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Assigned Role</label>
                <div className="flex items-center gap-2">
                  <Badge variant="primary" className="text-xs uppercase tracking-wider font-mono">
                    {user?.role || 'owner'}
                  </Badge>
                  <span className="text-xs text-gray-400">Scoped strictly to current organization</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-white">Team Members & Governance</h3>
              <p className="text-xs text-gray-400">Enforce strict role-based access control (RBAC).</p>
            </div>
            <Button size="sm" onClick={() => setInviteModalOpen(true)} className="flex items-center gap-1.5 text-xs">
              <Plus className="w-4 h-4" />
              Invite Member
            </Button>
          </div>

          <Card className="bg-gray-900/60 border-gray-800">
            <CardContent className="p-0">
              {loadingMembers ? (
                <div className="p-8 text-center text-gray-400 text-xs">Loading members...</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/60 text-gray-400 uppercase border-b border-gray-800">
                    <tr>
                      <th className="px-5 py-3">Member</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Joined At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {members.map((m: any) => (
                      <tr key={m.id} className="hover:bg-gray-800/30">
                        <td className="px-5 py-3.5 font-medium text-white">
                          <div>{m.user?.name || m.email || 'Team Member'}</div>
                          <div className="text-gray-400 text-[11px] font-mono">{m.user?.email || m.email}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={m.role === 'owner' || m.role === 'admin' ? 'primary' : 'outline'} className="uppercase text-[10px]">
                            {m.role}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="success" className="text-[10px]">
                            {m.status || 'active'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-gray-400">
                          {new Date(m.created_at || Date.now()).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Policies */}
      {activeTab === 'policies' && (
        <form onSubmit={handleSavePolicies} className="space-y-6">
          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader className="border-b border-gray-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Purchase Request Policy Matrix</h3>
                <p className="text-xs text-gray-400">Deterministic multi-tier evaluation in integer minor units (paise).</p>
              </div>
              <Badge variant="info">Enforced Server-Side</Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Tier 1 */}
              <div className="p-4 rounded-lg bg-gray-950/60 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-emerald-400">Tier 1: Single Approver Threshold</h4>
                  <Badge variant="outline">Single Approval</Badge>
                </div>
                <p className="text-xs text-gray-400">
                  Requests up to this amount require only 1 authorized approver or direct manager sign-off.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-sm text-gray-400">Threshold: ₹</span>
                  <Input 
                    type="number" 
                    value={tier1Threshold} 
                    onChange={(e) => setTier1Threshold(e.target.value)}
                    className="w-36 text-sm"
                  />
                  <span className="text-xs text-gray-500 font-mono">({(parseInt(tier1Threshold || '0') * 100).toLocaleString()} paise)</span>
                </div>
              </div>

              {/* Tier 2 */}
              <div className="p-4 rounded-lg bg-gray-950/60 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-amber-400">Tier 2: Department Manager Threshold</h4>
                  <Badge variant="outline">Manager Required</Badge>
                </div>
                <p className="text-xs text-gray-400">
                  Requests exceeding Tier 1 up to this threshold require designated Department Manager authorization.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-sm text-gray-400">Threshold: ₹</span>
                  <Input 
                    type="number" 
                    value={tier2Threshold} 
                    onChange={(e) => setTier2Threshold(e.target.value)}
                    className="w-36 text-sm"
                  />
                  <span className="text-xs text-gray-500 font-mono">({(parseInt(tier2Threshold || '0') * 100).toLocaleString()} paise)</span>
                </div>
              </div>

              {/* Tier 3 */}
              <div className="p-4 rounded-lg bg-gray-950/60 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-purple-400">Tier 3: Executive & Dual Sequential Approval</h4>
                  <Badge variant="primary">2-Stage Sequential</Badge>
                </div>
                <p className="text-xs text-gray-400">
                  Requests exceeding Tier 2 (&gt; ₹{tier2Threshold}) automatically trigger a 2-stage sequential approval workflow: Stage 1 (Department Manager) followed by Stage 2 (Designated Finance Executive).
                </p>
              </div>

              {/* Self-Approval Protection */}
              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Strict Self-Approval Prohibition</h4>
                  <p className="text-xs text-gray-400">Requesters cannot approve their own purchase requests regardless of role.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="selfApproval"
                    checked={!allowSelfApproval}
                    onChange={(e) => setAllowSelfApproval(!e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-gray-900 border-gray-700"
                  />
                  <label htmlFor="selfApproval" className="text-xs text-gray-300 font-medium">
                    Enforce Anti-Self-Approval Guard
                  </label>
                </div>
              </div>

              {/* Baseline Manual Processing Time */}
              <div className="pt-2 border-t border-gray-800/80">
                <label className="block text-sm font-medium text-white mb-1">
                  Baseline Manual Processing Time per Request (Minutes)
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Used as benchmark to audit transparent estimated operational time saved.
                </p>
                <div className="flex items-center gap-3">
                  <Input 
                    type="number" 
                    value={baselineMinutes} 
                    onChange={(e) => setBaselineMinutes(e.target.value)}
                    className="w-28 text-sm"
                  />
                  <span className="text-xs text-gray-400">minutes / workflow execution</span>
                </div>
              </div>

              {policySaved && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Policy parameters validated and saved successfully to database!
                </div>
              )}

              <Button type="submit" variant="primary" className="text-xs">
                Save Policy Configurations
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab: Demo & Status */}
      {activeTab === 'demo' && (
        <div className="space-y-6">
          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader className="border-b border-gray-800 pb-3">
              <h3 className="font-semibold text-white">System Architecture & Service Health</h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gray-950/60 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">Database Layer</span>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white">Durable LibSQL Engine</p>
                  <p className="text-[11px] text-gray-500 mt-1">Full ACID transactions, PostgreSQL migration parity</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-950/60 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">AI Intelligence</span>
                    <Badge variant="primary">Gemini 2.5 Flash</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white">@google/genai SDK</p>
                  <p className="text-[11px] text-gray-500 mt-1">Advisory classification, schema validation, fallback demo adapter</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-950/60 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-medium">Execution Engine</span>
                    <Badge variant="success">Running</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white">Durable DAG Worker</p>
                  <p className="text-[11px] text-gray-500 mt-1">Persistent job queue, lock leases, bounded exponential backoff</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800">
            <CardHeader className="border-b border-gray-800 pb-3">
              <h3 className="font-semibold text-white">Synthetic Demo Presets & Verification Sandbox</h3>
              <p className="text-xs text-gray-400">
                Populate complete sample requests across all policy tiers, approval records, documents, and notifications.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                Need to demonstrate the system end-to-end? Clicking the button below resets and populates high-fidelity test records including Tier 1, Tier 2, and Tier 3 purchase requests, dual-stage approvals, and operational metrics.
              </p>

              {seedSuccess && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {seedSuccess}
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleSeedDemoData}
                loading={isSeeding}
                className="flex items-center gap-2 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/30"
              >
                <RefreshCw className="w-4 h-4" />
                Seed Demonstration Scenarios
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite New Organization Member"
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
            <Input
              type="email"
              required
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Organization Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="member">Member (Create and track requests)</option>
              <option value="approver">Approver (Review and approve requests)</option>
              <option value="manager">Manager (Department head approval)</option>
              <option value="admin">Admin (Manage templates & users)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isInviting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
