import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, Shield, Plus, Pencil, Trash2, Loader2, Search, Lock,
  Eye, FilePlus, BookOpen, Edit3, X as XIcon, Check, AlertTriangle,
  CheckCircle2, AlertCircle, RotateCcw, Save, ChevronDown, ChevronRight,
  UserPlus, Mail, Phone, KeyRound, LayoutGrid, List as ListIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CustomRole {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
}

interface RolePermission {
  id: string;
  role_id: string;
  page_key: string;
  can_view: boolean;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

interface ProfileRow {
  id: string;
  email?: string;
  phone?: string | null;
  full_name: string;
  role: string;
  is_active: boolean;
  custom_role_id: string | null;
  custom_role_name?: string | null;
  organisation_id?: string;
}

export interface PagePerms {
  can_view: boolean;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

type PermDraft = Record<string, PagePerms>;

// ── Page catalogue (grouped) ──────────────────────────────────────────────────
const PAGE_GROUPS: { label: string; pages: { key: string; label: string }[] }[] = [
  {
    label: 'Staff Portal',
    pages: [
      { key: 'farmer-management', label: 'Farmer Registry' },
      { key: 'farmer-enrollment', label: 'Farmer Enrollment' },
      { key: 'programs',          label: 'Programs Setup' },
      { key: 'agents',            label: 'Agent Assignment' },
      { key: 'checkin-settings',  label: 'Check-in Config' },
      { key: 'community',         label: 'Community Profiling' },
      { key: 'governance',        label: 'Cooperative Governance' },
      { key: 'users',             label: 'User Management' },
    ],
  },
  {
    label: 'Analytics & Intelligence',
    pages: [
      { key: 'fri',               label: 'FRI Dashboard' },
      { key: 'intelligence',      label: 'Risk Intelligence' },
      { key: 'dashboard',         label: 'Intelligence Dashboard' },
      { key: 'reports',           label: 'Reports' },
    ],
  },
  {
    label: 'Portals',
    pages: [
      { key: 'interventions',     label: 'Opportunities / Interventions' },
      { key: 'credits',           label: 'Credits Module' },
      { key: 'team',              label: 'Finance & Insurance' },
      { key: 'partner',           label: 'Partner / MERL' },
      { key: 'agronomist',        label: 'Agronomist' },
    ],
  },
];

const ALL_PAGES = PAGE_GROUPS.flatMap(g => g.pages);

const PERM_FLAGS = [
  { key: 'can_view'   as const, label: 'View',   icon: Eye      },
  { key: 'can_create' as const, label: 'Create', icon: FilePlus },
  { key: 'can_read'   as const, label: 'Read',   icon: BookOpen },
  { key: 'can_update' as const, label: 'Update', icon: Edit3    },
  { key: 'can_delete' as const, label: 'Delete', icon: Trash2   },
];

type PermFlag = (typeof PERM_FLAGS)[number]['key'];

const EMPTY_PERMS: PagePerms = {
  can_view: false, can_create: false, can_read: false,
  can_update: false, can_delete: false,
};

function buildDraft(perms: RolePermission[], roleId: string): PermDraft {
  const draft: PermDraft = {};
  ALL_PAGES.forEach(p => { draft[p.key] = { ...EMPTY_PERMS }; });
  perms.filter(p => p.role_id === roleId).forEach(p => {
    draft[p.page_key] = {
      can_view: p.can_view, can_create: p.can_create,
      can_read: p.can_read, can_update: p.can_update, can_delete: p.can_delete,
    };
  });
  return draft;
}

// ── Component ─────────────────────────────────────────────────────────────────
// Built-in roles that always exist (not stored in custom_roles table)
const BUILTIN_ROLES: CustomRole[] = [
  { id: '__farmer',      name: 'Farmer',           description: 'Farmer portal — check-ins, scores, opportunities', is_system: true, created_at: '' },
  { id: '__agent',       name: 'Agent',            description: 'Field agent — farmer registration, verification, check-ins', is_system: true, created_at: '' },
  { id: '__staff',       name: 'Staff',            description: 'Program staff — full access to farmer management, programs, reports', is_system: true, created_at: '' },
  { id: '__admin',       name: 'Admin',            description: 'Organisation administrator — all staff features plus user management', is_system: true, created_at: '' },
  { id: '__partner',     name: 'Partner',          description: 'Partner / MERL — intelligence dashboards, interventions, cohort performance', is_system: true, created_at: '' },
  { id: '__agronomist',  name: 'Agronomist',       description: 'Agronomist — advisory, interventions, FRI dashboard', is_system: true, created_at: '' },
  { id: '__credits',     name: 'Credits',          description: 'Credits team — applications, risk scoring, portfolio, offtake', is_system: true, created_at: '' },
  { id: '__team',        name: 'Finance & Insurance', description: 'Finance team — petty cash, fund requests, loans, insurance', is_system: true, created_at: '' },
  { id: '__super_admin', name: 'Super Admin',      description: 'Super admin — unrestricted access to all portals and organisations', is_system: true, created_at: '' },
];

// Built-in role permission presets (what each built-in role can access)
const BUILTIN_ROLE_PERMS: Record<string, PermDraft> = {
  __farmer: {
    'farmer-management': { can_view: false, can_create: false, can_read: true, can_update: false, can_delete: false },
    'farmer-enrollment': { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'programs':          { can_view: false, can_create: false, can_read: true, can_update: false, can_delete: false },
    'agents':            { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'checkin-settings':  { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'community':         { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'governance':        { can_view: false, can_create: false, can_read: true, can_update: false, can_delete: false },
    'users':             { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'fri':               { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'intelligence':      { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'dashboard':         { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'reports':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'interventions':     { can_view: true,  can_create: true,  can_read: true, can_update: false, can_delete: false },
    'credits':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'team':              { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'partner':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'agronomist':        { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
  },
  __agent: {
    'farmer-management': { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'farmer-enrollment': { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'programs':          { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'agents':            { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'checkin-settings':  { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'community':         { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'governance':        { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'users':             { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'fri':               { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'intelligence':      { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'dashboard':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'reports':           { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'interventions':     { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'credits':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'team':              { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'partner':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'agronomist':        { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
  },
  __staff: {
    'farmer-management': { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'farmer-enrollment': { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'programs':          { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'agents':            { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'checkin-settings':  { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'community':         { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'governance':        { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'users':             { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'fri':               { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'intelligence':      { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'dashboard':         { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'reports':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'interventions':     { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'credits':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'team':              { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'partner':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'agronomist':        { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
  },
  __admin: {
    'farmer-management': { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'farmer-enrollment': { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'programs':          { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'agents':            { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'checkin-settings':  { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'community':         { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'governance':        { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'users':             { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'fri':               { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'intelligence':      { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'dashboard':         { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'reports':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'interventions':     { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'credits':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'team':              { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'partner':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'agronomist':        { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
  },
  __partner: {
    'farmer-management': { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'farmer-enrollment': { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'programs':          { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'agents':            { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'checkin-settings':  { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'community':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'governance':        { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'users':             { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'fri':               { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'intelligence':      { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'dashboard':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'reports':           { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'interventions':     { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'credits':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'team':              { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'partner':           { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'agronomist':        { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
  },
  __agronomist: {
    'farmer-management': { can_view: true,  can_create: false, can_read: true, can_update: true,  can_delete: false },
    'farmer-enrollment': { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'programs':          { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'agents':            { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'checkin-settings':  { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'community':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'governance':        { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'users':             { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'fri':               { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'intelligence':      { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'dashboard':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'reports':           { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'interventions':     { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'credits':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'team':              { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'partner':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'agronomist':        { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
  },
  __credits: {
    'farmer-management': { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'farmer-enrollment': { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'programs':          { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'agents':            { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'checkin-settings':  { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'community':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'governance':        { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'users':             { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'fri':               { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'intelligence':      { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'dashboard':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'reports':           { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'interventions':     { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'credits':           { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: true },
    'team':              { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'partner':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'agronomist':        { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
  },
  __team: {
    'farmer-management': { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'farmer-enrollment': { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'programs':          { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'agents':            { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'checkin-settings':  { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'community':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'governance':        { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'users':             { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'fri':               { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'intelligence':      { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'dashboard':         { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'reports':           { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: false },
    'interventions':     { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'credits':           { can_view: true,  can_create: false, can_read: true, can_update: false, can_delete: false },
    'team':              { can_view: true,  can_create: true,  can_read: true, can_update: true,  can_delete: true },
    'partner':           { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
    'agronomist':        { can_view: false, can_create: false, can_read: false, can_update: false, can_delete: false },
  },
  __super_admin: {
    'farmer-management': { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'farmer-enrollment': { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'programs':          { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'agents':            { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'checkin-settings':  { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'community':         { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'governance':        { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'users':             { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'fri':               { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'intelligence':      { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'dashboard':         { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'reports':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'interventions':     { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'credits':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'team':              { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'partner':           { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
    'agronomist':        { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true },
  },
};

export default function UserManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('subtab') as 'users' | 'roles' | 'permissions') || 'users';
  const [tab, setTab] = useState<'users' | 'roles' | 'permissions'>(
    ['users', 'roles', 'permissions'].includes(tabParam) ? tabParam : 'users'
  );

  function switchTab(t: 'users' | 'roles' | 'permissions') {
    setTab(t);
    setSearchParams(prev => { prev.set('subtab', t); return prev; });
  }

  const [roles,       setRoles]       = useState<CustomRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [profiles,    setProfiles]    = useState<ProfileRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const BASE_PAGE_SIZE = 10;
  const [loadAll, setLoadAll] = useState(false);

  const [roleDialog, setRoleDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; role?: CustomRole }>({ open: false, mode: 'create' });
  const [userDialog, setUserDialog] = useState<{ open: boolean; profile?: ProfileRow }>({ open: false });
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [permRole,   setPermRole]   = useState<string>('');
  const [permDraft,  setPermDraft]  = useState<PermDraft>({});
  const [permSaved,  setPermSaved]  = useState<PermDraft>({});   // last-saved snapshot
  const [savingPerms, setSavingPerms] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [roleViewMode, setRoleViewMode] = useState<'card' | 'list'>('card');

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load independently so one failing query doesn't block the others
      const [rolesRes, permsRes, profRes] = await Promise.all([
        supabase.from('custom_roles').select('*').order('name'),
        supabase.from('custom_role_permissions').select('*'),
        supabase.from('users').select('id, full_name, phone, role, is_active, custom_role_id, organisation_id').order('full_name'),
      ]);

      const rolesData = (rolesRes.data ?? []) as CustomRole[];
      const permsData = (permsRes.data ?? []) as RolePermission[];
      setRoles(rolesData);
      setPermissions(permsData);

      if (profRes.error) {
        console.error('loadData: users query failed', profRes.error);
      }
      if (profRes.data) {
        const profs = (profRes.data as ProfileRow[]).map(p => ({
          ...p,
          custom_role_name: rolesData.find(r => r.id === p.custom_role_id)?.name ?? null,
        }));
        setProfiles(profs);
      }

      // initialise permission role selector
      setPermRole(prev => {
        const id = prev || (rolesData[0]?.id ?? '');
        if (id) {
          const draft = buildDraft(permsData, id);
          setPermDraft(draft);
          setPermSaved(draft);
        }
        return id;
      });
    } catch (err) {
      console.error('Failed to load user management data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Rebuild draft when role selector changes
  useEffect(() => {
    if (!permRole) return;
    if (permRole.startsWith('__')) {
      // Built-in role — use preset permissions (read-only)
      const draft = BUILTIN_ROLE_PERMS[permRole] ?? {};
      const full: PermDraft = {};
      ALL_PAGES.forEach(p => { full[p.key] = draft[p.key] ?? { ...EMPTY_PERMS }; });
      setPermDraft(full);
      setPermSaved(full);
    } else {
      const draft = buildDraft(permissions, permRole);
      setPermDraft(draft);
      setPermSaved(draft);
    }
  }, [permRole]); // eslint-disable-line react-hooks/exhaustive-deps

  const permDirty = useMemo(
    () => JSON.stringify(permDraft) !== JSON.stringify(permSaved),
    [permDraft, permSaved]
  );

  // ── Role CRUD ──────────────────────────────────────────────────────────────
  async function saveRole(name: string, description: string, id?: string) {
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase.from('custom_roles').update({ name, description }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('custom_roles').insert({ name, description, is_system: false });
        if (error) throw error;
      }
      setRoleDialog({ open: false, mode: 'create' });
      await loadData();
      showToast(id ? 'Role updated' : 'Role created');
    } catch (err: any) {
      showToast(err.message || 'Failed to save role', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: CustomRole) {
    if (role.is_system) { showToast('Built-in roles cannot be deleted', 'error'); return; }
    if (!confirm(`Delete role "${role.name}"? Users assigned to it will lose their custom permissions.`)) return;
    try {
      const { error } = await supabase.from('custom_roles').delete().eq('id', role.id);
      if (error) throw error;
      await loadData();
      showToast('Role deleted');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role', 'error');
    }
  }

  // ── User management ────────────────────────────────────────────────────────
  async function assignRole(profileId: string, customRoleId: string | null) {
    try {
      const { error } = await supabase.from('users').update({ custom_role_id: customRoleId }).eq('id', profileId);
      if (error) throw error;
      await loadData();
      showToast('Role assigned');
    } catch (err: any) {
      showToast(err.message || 'Failed to assign role', 'error');
    }
  }

  async function toggleActive(profile: ProfileRow) {
    try {
      const { error } = await supabase.from('users').update({ is_active: !profile.is_active }).eq('id', profile.id);
      if (error) throw error;
      await loadData();
      showToast('User updated');
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
    }
  }

  // ── Create user via edge function ──────────────────────────────────────────
  async function createUser(payload: {
    email: string; password: string; fullName: string;
    role: string; phone?: string; customRoleId?: string | null;
  }) {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-staff-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          full_name: payload.fullName,
          role: payload.role,
          phone: payload.phone,
          custom_role_id: payload.customRoleId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create user');
      setNewUserDialog(false);
      await loadData();
      showToast('User created successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Permissions draft helpers ──────────────────────────────────────────────
  function toggleFlag(pageKey: string, flag: PermFlag) {
    setPermDraft(prev => ({
      ...prev,
      [pageKey]: { ...prev[pageKey], [flag]: !prev[pageKey][flag] },
    }));
  }

  function toggleRowAll(pageKey: string) {
    const cur = permDraft[pageKey];
    const allOn = PERM_FLAGS.every(f => cur[f.key]);
    const next = {} as PagePerms;
    PERM_FLAGS.forEach(f => { next[f.key] = !allOn; });
    setPermDraft(prev => ({ ...prev, [pageKey]: next }));
  }

  function grantAllRole() {
    const next: PermDraft = {};
    ALL_PAGES.forEach(p => {
      next[p.key] = { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true };
    });
    setPermDraft(next);
  }

  function revokeAllRole() {
    const next: PermDraft = {};
    ALL_PAGES.forEach(p => { next[p.key] = { ...EMPTY_PERMS }; });
    setPermDraft(next);
  }

  function grantGroupAll(groupLabel: string) {
    const group = PAGE_GROUPS.find(g => g.label === groupLabel);
    if (!group) return;
    setPermDraft(prev => {
      const next = { ...prev };
      group.pages.forEach(p => {
        next[p.key] = { can_view: true, can_create: true, can_read: true, can_update: true, can_delete: true };
      });
      return next;
    });
  }

  function revokeGroupAll(groupLabel: string) {
    const group = PAGE_GROUPS.find(g => g.label === groupLabel);
    if (!group) return;
    setPermDraft(prev => {
      const next = { ...prev };
      group.pages.forEach(p => { next[p.key] = { ...EMPTY_PERMS }; });
      return next;
    });
  }

  function resetPermDraft() {
    setPermDraft({ ...permSaved });
  }

  // ── Batch save permissions ─────────────────────────────────────────────────
  async function savePermissions() {
    if (!permRole) return;
    setSavingPerms(true);
    try {
      // Build upsert payload for all pages
      const rows = ALL_PAGES.map(p => ({
        role_id: permRole,
        page_key: p.key,
        ...permDraft[p.key],
      }));

      const { error } = await supabase
        .from('custom_role_permissions')
        .upsert(rows, { onConflict: 'role_id,page_key' });

      if (error) throw error;

      // Refresh permissions from DB
      const { data, error: fetchErr } = await supabase
        .from('custom_role_permissions')
        .select('*')
        .eq('role_id', permRole);
      if (fetchErr) throw fetchErr;

      setPermissions(prev => [
        ...prev.filter(p => p.role_id !== permRole),
        ...(data as RolePermission[]),
      ]);
      const saved = buildDraft(data as RolePermission[], permRole);
      setPermSaved(saved);
      setPermDraft(saved);
      showToast('Permissions saved');
    } catch (err: any) {
      showToast(err.message || 'Failed to save permissions', 'error');
    } finally {
      setSavingPerms(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredProfiles = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.toLowerCase().includes(search.toLowerCase())
  );
  const pageSize    = loadAll ? filteredProfiles.length : BASE_PAGE_SIZE;
  const totalPages  = Math.max(1, Math.ceil(filteredProfiles.length / pageSize));
  const pagedProfiles = filteredProfiles.slice((page - 1) * pageSize, page * pageSize);
  const allRoles = [...BUILTIN_ROLES, ...roles];
  const permRoleObj = allRoles.find(r => r.id === permRole);
  const isBuiltinRole = permRole.startsWith('__');

  function toggleGroup(label: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-cropguard-forest" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-cropguard-forest" />
          User Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, roles, and page-level permissions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'users',       label: 'Users',       icon: Users  },
          { key: 'roles',       label: 'Roles',       icon: Shield },
          { key: 'permissions', label: 'Permissions', icon: Lock   },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-cropguard-forest text-cropguard-forest'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Users tab ─────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search users…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary" className="text-xs">{filteredProfiles.length} users</Badge>
            </div>
            <Button onClick={() => setNewUserDialog(true)} className="bg-cropguard-forest hover:bg-cropguard-dark">
              <UserPlus className="w-4 h-4 mr-1.5" /> New User
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[25%]">Name</TableHead>
                  <TableHead className="w-[25%]">Email</TableHead>
                  <TableHead className="w-[15%]">Built-in Role</TableHead>
                  <TableHead className="w-[20%]">Custom Role</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[5%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedProfiles.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-gray-900">{p.full_name || '—'}</TableCell>
                    <TableCell className="text-gray-600">{p.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{p.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <select
                        value={p.custom_role_id ?? ''}
                        onChange={e => assignRole(p.id, e.target.value || null)}
                        className="text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-cropguard-forest/30"
                      >
                        <option value="">— None —</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleActive(p)}
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors',
                          p.is_active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', p.is_active ? 'bg-green-500' : 'bg-gray-400')} />
                        {p.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setUserDialog({ open: true, profile: p })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProfiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page} totalPages={totalPages} onPageChange={setPage}
            totalItems={filteredProfiles.length} pageSize={pageSize}
            onLoadAll={() => { setLoadAll(true); setPage(1); }}
            onResetPaging={() => { setLoadAll(false); setPage(1); }}
          />
        </div>
      )}

      {/* ── Roles tab ─────────────────────────────────────────────────────── */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Create custom roles and assign granular permissions per page.</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setRoleViewMode('card')}
                  className={cn('p-1.5 transition-colors', roleViewMode === 'card' ? 'bg-cropguard-forest text-white' : 'bg-white text-gray-400 hover:text-gray-600')}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRoleViewMode('list')}
                  className={cn('p-1.5 transition-colors', roleViewMode === 'list' ? 'bg-cropguard-forest text-white' : 'bg-white text-gray-400 hover:text-gray-600')}
                  title="List view"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
              <Button onClick={() => setRoleDialog({ open: true, mode: 'create' })} className="bg-cropguard-forest hover:bg-cropguard-dark">
                <Plus className="w-4 h-4 mr-1.5" /> New Role
              </Button>
            </div>
          </div>

          {/* Built-in roles section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-700">Built-in Roles</h3>
              <Badge variant="secondary" className="text-[10px]">{BUILTIN_ROLES.length}</Badge>
            </div>
            {roleViewMode === 'card' ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BUILTIN_ROLES.map(role => {
                  const permCount = Object.values(BUILTIN_ROLE_PERMS[role.id] ?? {}).filter(p => p.can_view || p.can_create || p.can_read || p.can_update || p.can_delete).length;
                  const userCount = profiles.filter(p => p.role === role.name.toLowerCase().replace(' finance & insurance', '')).length;
                  return (
                    <div key={role.id} className="border rounded-xl p-4 bg-amber-50/30 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
                            <Badge variant="secondary" className="text-[10px] mt-0.5">Built-in</Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 min-h-[2rem]">{role.description || 'No description'}</p>
                      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {permCount} pages</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {userCount} users</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
                {BUILTIN_ROLES.map(role => {
                  const permCount = Object.values(BUILTIN_ROLE_PERMS[role.id] ?? {}).filter(p => p.can_view || p.can_create || p.can_read || p.can_update || p.can_delete).length;
                  const userCount = profiles.filter(p => p.role === role.name.toLowerCase().replace(' finance & insurance', '')).length;
                  return (
                    <div key={role.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50/20 hover:bg-amber-50/40 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 shrink-0">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
                          <Badge variant="secondary" className="text-[10px]">Built-in</Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{role.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {permCount}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {userCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom roles section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-cropguard-forest" />
              <h3 className="text-sm font-semibold text-gray-700">Custom Roles</h3>
              <Badge variant="secondary" className="text-[10px]">{roles.length}</Badge>
            </div>
            {roleViewMode === 'card' ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map(role => {
                  const permCount = permissions.filter(p => p.role_id === role.id && (p.can_view || p.can_create || p.can_read || p.can_update || p.can_delete)).length;
                  const userCount = profiles.filter(p => p.custom_role_id === role.id).length;
                  return (
                    <div key={role.id} className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-cropguard-forest/10 text-cropguard-forest">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
                            {role.is_system && <Badge variant="secondary" className="text-[10px] mt-0.5">Built-in</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setRoleDialog({ open: true, mode: 'edit', role })}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {!role.is_system && (
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteRole(role)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2 min-h-[2rem]">{role.description || 'No description'}</p>
                      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {permCount} pages</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {userCount} users</span>
                      </div>
                    </div>
                  );
                })}
                {roles.length === 0 && (
                  <div className="col-span-full text-center text-gray-400 text-sm py-8 border border-dashed rounded-xl">
                    No custom roles yet. Click "New Role" to create one.
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-50">
                {roles.map(role => {
                  const permCount = permissions.filter(p => p.role_id === role.id && (p.can_view || p.can_create || p.can_read || p.can_update || p.can_delete)).length;
                  const userCount = profiles.filter(p => p.custom_role_id === role.id).length;
                  return (
                    <div key={role.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cropguard-forest/10 text-cropguard-forest shrink-0">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{role.name}</p>
                          {role.is_system && <Badge variant="secondary" className="text-[10px]">Built-in</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{role.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> {permCount}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {userCount}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => setRoleDialog({ open: true, mode: 'edit', role })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {!role.is_system && (
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteRole(role)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {roles.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    No custom roles yet. Click "New Role" to create one.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Permissions tab ───────────────────────────────────────────────── */}
      {tab === 'permissions' && (
        <div className="space-y-5">
          {/* Role selector + global actions */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <Label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Role:</Label>
                <select
                  value={permRole}
                  onChange={e => setPermRole(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cropguard-forest/30 min-w-[180px]"
                >
                  <option value="" disabled>— Select a role —</option>
                  <optgroup label="Built-in Roles">
                    {BUILTIN_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </optgroup>
                  <optgroup label="Custom Roles">
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </optgroup>
                </select>
                {permRoleObj && (
                  <span className="text-xs text-gray-400">
                    {isBuiltinRole
                      ? 'Built-in role (read-only)'
                      : `${profiles.filter(p => p.custom_role_id === permRole).length} users assigned`}
                  </span>
                )}
              </div>

              {permRoleObj && !isBuiltinRole && (
                <div className="flex items-center gap-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={grantAllRole} className="text-xs h-8">
                    <Check className="w-3 h-3 mr-1" /> Grant All
                  </Button>
                  <Button size="sm" variant="outline" onClick={revokeAllRole} className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50">
                    <XIcon className="w-3 h-3 mr-1" /> Revoke All
                  </Button>
                  {permDirty && (
                    <>
                      <Button size="sm" variant="ghost" onClick={resetPermDraft} className="text-xs h-8 text-gray-500">
                        <RotateCcw className="w-3 h-3 mr-1" /> Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={savePermissions}
                        disabled={savingPerms}
                        className="text-xs h-8 bg-cropguard-forest hover:bg-cropguard-dark"
                      >
                        {savingPerms
                          ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          : <Save className="w-3 h-3 mr-1" />}
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              )}
              {permRoleObj && isBuiltinRole && (
                <div className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Built-in role permissions are preset and cannot be modified
                </div>
              )}
            </div>

            {permDirty && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                You have unsaved changes. Click <strong>Save Changes</strong> to apply them.
              </div>
            )}
          </div>

          {/* No role selected */}
          {!permRoleObj && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Lock className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">Select a role to manage its permissions</p>
              <p className="text-xs mt-1">Choose a role from the dropdown above</p>
            </div>
          )}

          {/* Permission matrix — grouped */}
          {permRoleObj && PAGE_GROUPS.map(group => {
            const collapsed = collapsedGroups.has(group.label);
            const groupPages = group.pages;
            const allGranted = groupPages.every(p =>
              PERM_FLAGS.every(f => permDraft[p.key]?.[f.key])
            );
            const anyGranted = groupPages.some(p =>
              PERM_FLAGS.some(f => permDraft[p.key]?.[f.key])
            );

            return (
              <div key={group.label} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                {/* Group header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    {collapsed
                      ? <ChevronRight className="w-4 h-4 text-gray-400" />
                      : <ChevronDown  className="w-4 h-4 text-gray-400" />}
                    {group.label}
                    <span className="ml-1 text-xs font-normal text-gray-400">({groupPages.length} pages)</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      allGranted ? 'bg-emerald-50 text-emerald-700' :
                      anyGranted ? 'bg-amber-50 text-amber-700' :
                                   'bg-gray-100 text-gray-500'
                    )}>
                      {allGranted ? 'All granted' : anyGranted ? 'Partial' : 'None granted'}
                    </span>
                    <button
                      onClick={() => grantGroupAll(group.label)}
                      className="text-[11px] text-cropguard-forest hover:underline font-medium"
                    >Grant all</button>
                    <span className="text-gray-300">·</span>
                    <button
                      onClick={() => revokeGroupAll(group.label)}
                      className="text-[11px] text-red-500 hover:underline font-medium"
                    >Revoke all</button>
                  </div>
                </div>

                {/* Rows */}
                {!collapsed && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-white">
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-[35%]">Page</th>
                        {PERM_FLAGS.map(f => (
                          <th key={f.key} className="text-center px-2 py-2 w-[10%]">
                            <div className="flex flex-col items-center gap-0.5">
                              <f.icon className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-[9px] uppercase tracking-wide text-gray-400">{f.label}</span>
                            </div>
                          </th>
                        ))}
                        <th className="text-center px-3 py-2 w-[10%]">
                          <span className="text-[9px] uppercase tracking-wide text-gray-400">All</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupPages.map((pg, idx) => {
                        const perms = permDraft[pg.key] ?? EMPTY_PERMS;
                        const rowAllOn = PERM_FLAGS.every(f => perms[f.key]);
                        const rowAnyOn = PERM_FLAGS.some(f => perms[f.key]);
                        return (
                          <tr
                            key={pg.key}
                            className={cn(
                              'border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
                              idx === groupPages.length - 1 && 'border-b-0'
                            )}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'w-1.5 h-1.5 rounded-full shrink-0',
                                  rowAllOn ? 'bg-emerald-400' : rowAnyOn ? 'bg-amber-400' : 'bg-gray-200'
                                )} />
                                <span className="font-medium text-gray-700 text-sm">{pg.label}</span>
                              </div>
                            </td>
                            {PERM_FLAGS.map(f => {
                              const checked = perms[f.key];
                              return (
                                <td key={f.key} className="text-center px-2 py-2.5">
                                  <button
                                    onClick={() => !isBuiltinRole && toggleFlag(pg.key, f.key)}
                                    disabled={isBuiltinRole}
                                    className={cn(
                                      'inline-flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all mx-auto',
                                      isBuiltinRole && 'cursor-not-allowed opacity-70',
                                      checked
                                        ? 'bg-cropguard-forest border-cropguard-forest text-white'
                                        : 'bg-white border-gray-200 text-transparent'
                                    )}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              );
                            })}
                            <td className="text-center px-3 py-2.5">
                              <button
                                onClick={() => !isBuiltinRole && toggleRowAll(pg.key)}
                                disabled={isBuiltinRole}
                                title={rowAllOn ? 'Revoke all for this page' : 'Grant all for this page'}
                                className={cn(
                                  'inline-flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all mx-auto',
                                  isBuiltinRole && 'cursor-not-allowed opacity-70',
                                  rowAllOn
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'bg-white border-dashed border-gray-300 text-gray-400'
                                )}
                              >
                                {rowAllOn ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {/* Sticky save bar when dirty */}
          {permRoleObj && permDirty && !isBuiltinRole && (
            <div className="sticky bottom-4 z-10">
              <div className="bg-cropguard-forest text-white rounded-xl shadow-lg px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-300" />
                  <span>You have unsaved permission changes</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={resetPermDraft} className="text-white/80 hover:text-white hover:bg-white/10 h-8 text-xs">
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={savePermissions}
                    disabled={savingPerms}
                    className="bg-white text-cropguard-forest hover:bg-gray-100 h-8 text-xs font-semibold"
                  >
                    {savingPerms
                      ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      : <Save className="w-3 h-3 mr-1" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* ── Role Dialog ─────────────────────────────────────────────────────── */}
      <RoleDialog
        open={roleDialog.open} mode={roleDialog.mode} role={roleDialog.role}
        saving={saving}
        onClose={() => setRoleDialog({ open: false, mode: 'create' })}
        onSave={saveRole}
      />

      {/* ── User Edit Dialog ────────────────────────────────────────────────── */}
      <UserEditDialog
        open={userDialog.open} profile={userDialog.profile} roles={roles}
        onClose={() => setUserDialog({ open: false })}
        onAssign={assignRole} onToggleActive={toggleActive}
      />

      {/* ── New User Dialog ─────────────────────────────────────────────────── */}
      <NewUserDialog
        open={newUserDialog} roles={roles} saving={saving}
        onClose={() => setNewUserDialog(false)}
        onSave={createUser}
      />
    </div>
  );
}

// ── Role Dialog ────────────────────────────────────────────────────────────────
function RoleDialog({ open, mode, role, saving, onClose, onSave }: {
  open: boolean; mode: 'create' | 'edit'; role?: CustomRole;
  saving: boolean; onClose: () => void;
  onSave: (name: string, description: string, id?: string) => void;
}) {
  const [name, setName]         = useState('');
  const [description, setDesc]  = useState('');
  useEffect(() => {
    if (open) { setName(role?.name ?? ''); setDesc(role?.description ?? ''); }
  }, [open, role]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Role' : 'Create Role'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update the role name and description.' : 'Create a new custom role. Assign permissions after creating.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role Name</Label>
            <Input
              id="role-name" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Field Officer" disabled={role?.is_system}
            />
            {role?.is_system && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Built-in role names cannot be changed
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-desc">Description</Label>
            <Input
              id="role-desc" value={description} onChange={e => setDesc(e.target.value)}
              placeholder="What this role is for…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving || !name.trim()}
            onClick={() => onSave(name.trim(), description.trim(), role?.id)}
            className="bg-cropguard-forest hover:bg-cropguard-dark"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {mode === 'edit' ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── User Edit Dialog ───────────────────────────────────────────────────────────
function UserEditDialog({ open, profile, roles, onClose, onAssign, onToggleActive }: {
  open: boolean; profile?: ProfileRow; roles: CustomRole[];
  onClose: () => void;
  onAssign: (profileId: string, customRoleId: string | null) => void;
  onToggleActive: (profile: ProfileRow) => void;
}) {
  if (!profile) return null;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Assign a custom role or change the user's status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-cropguard-forest/10 text-cropguard-forest flex items-center justify-center font-bold">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{profile.full_name}</p>
              <p className="text-xs text-gray-500">{profile.phone || profile.email || '—'}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Custom Role</Label>
            <select
              value={profile.custom_role_id ?? ''}
              onChange={e => onAssign(profile.id, e.target.value || null)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cropguard-forest/30"
            >
              <option value="">— None (use built-in role) —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <p className="text-xs text-gray-400">
              Built-in role: <span className="font-medium capitalize">{profile.role}</span>
            </p>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-xs text-gray-500">{profile.is_active ? 'User can sign in' : 'User is disabled'}</p>
            </div>
            <Button size="sm" variant={profile.is_active ? 'outline' : 'default'} onClick={() => onToggleActive(profile)}>
              {profile.is_active
                ? <><XIcon className="w-3.5 h-3.5 mr-1.5" />Disable</>
                : <><Check className="w-3.5 h-3.5 mr-1.5" />Enable</>}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── New User Dialog ───────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'staff',       label: 'Staff' },
  { value: 'admin',       label: 'Admin' },
  { value: 'agent',       label: 'Agent' },
  { value: 'partner',     label: 'Partner' },
  { value: 'agronomist',  label: 'Agronomist' },
  { value: 'credits',     label: 'Credits' },
  { value: 'team',        label: 'Finance / Insurance' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'farmer',      label: 'Farmer' },
];

function NewUserDialog({ open, roles, saving, onClose, onSave }: {
  open: boolean; roles: CustomRole[]; saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    email: string; password: string; fullName: string;
    role: string; phone?: string; customRoleId?: string | null;
  }) => void;
}) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole]         = useState('staff');
  const [phone, setPhone]       = useState('');
  const [customRoleId, setCustomRoleId] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(''); setPassword(''); setFullName('');
      setRole('staff'); setPhone(''); setCustomRoleId(''); setShowPassword(false);
    }
  }, [open]);

  const valid = email.trim() && password.trim().length >= 6 && fullName.trim();

  function handleSubmit() {
    if (!valid) return;
    onSave({
      email: email.trim(),
      password: password.trim(),
      fullName: fullName.trim(),
      role,
      phone: phone.trim() || undefined,
      customRoleId: customRoleId || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cropguard-forest" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Create a new account. The user will be able to sign in immediately with the email and password you set.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="nu-name">Full Name *</Label>
            <Input id="nu-name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Kofi Mensah" />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nu-email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input id="nu-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input id="nu-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+233..." className="pl-9" />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="nu-pass">Password *</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                id="nu-pass" type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters" className="pl-9 pr-16"
              />
              <button
                type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {password && password.length < 6 && (
              <p className="text-xs text-red-500">Password must be at least 6 characters</p>
            )}
          </div>

          {/* Role + Custom Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nu-role">Built-in Role *</Label>
              <select
                id="nu-role" value={role} onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cropguard-forest/30"
              >
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-custom">Custom Role</Label>
              <select
                id="nu-custom" value={customRoleId} onChange={e => setCustomRoleId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cropguard-forest/30"
              >
                <option value="">— None —</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400">
            The built-in role controls which portal the user sees. A custom role adds fine-grained page permissions on top.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving || !valid}
            onClick={handleSubmit}
            className="bg-cropguard-forest hover:bg-cropguard-dark"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
