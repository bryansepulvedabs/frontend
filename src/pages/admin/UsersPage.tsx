import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteUser,
  getDeletedUsers,
  getUsers,
  restoreUser,
  updateUser,
} from '../../api/users';
import type { Role } from '../../types/auth';
import type { User } from '../../types/user';
import './UsersPage.css';

type RoleFilter = Role | 'TODOS';
type Tab = 'active' | 'deleted';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Admin', EMPLOYEE: 'Empleado', CLIENT: 'Cliente' };

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('active');
  const [filter, setFilter] = useState<RoleFilter>('TODOS');

  const activeQuery = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const deletedQuery = useQuery({
    queryKey: ['users', 'deleted'],
    queryFn: getDeletedUsers,
    enabled: tab === 'deleted',
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ user, role }: { user: User; role: Role }) =>
      updateUser(user.id, { ...user, role }),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: invalidateAll,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreUser,
    onSuccess: invalidateAll,
  });

  const query = tab === 'active' ? activeQuery : deletedQuery;
  const users = query.data ?? [];
  const filtered = users.filter((u) => filter === 'TODOS' || u.role === filter);

  const actionError =
    deleteMutation.error?.message ?? restoreMutation.error?.message ?? roleMutation.error?.message ?? null;

  return (
    <section className="users">
      <div className="users__intro">
        <div>
          <h1>Usuarios</h1>
          <p>Clientes y personal con sus roles de acceso.</p>
        </div>
      </div>

      <div className="users__tabs" role="tablist" aria-label="Estado de los usuarios">
        <button
          type="button" role="tab"
          className="users__tab" aria-selected={tab === 'active'}
          onClick={() => setTab('active')}
        >
          Activos
        </button>
        <button
          type="button" role="tab"
          className="users__tab" aria-selected={tab === 'deleted'}
          onClick={() => setTab('deleted')}
        >
          Eliminados
        </button>
      </div>

      <div className="pills" role="group" aria-label="Filtrar por rol">
        <button type="button" className="pill" aria-pressed={filter === 'TODOS'} onClick={() => setFilter('TODOS')}>
          Todos
        </button>
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <button key={r} type="button" className="pill" aria-pressed={filter === r} onClick={() => setFilter(r)}>
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="users__state users__state--error" role="alert">{actionError}</p>
      )}

      {query.isPending && <p className="users__state">Cargando usuarios…</p>}
      {query.isError && <p className="users__state users__state--error">{query.error.message}</p>}

      {!query.isPending && !query.isError && filtered.length === 0 && (
        <p className="users__state">
          {tab === 'active'
            ? 'No hay usuarios que coincidan con este filtro.'
            : 'No hay usuarios eliminados.'}
        </p>
      )}

      {!query.isPending && !query.isError && filtered.length > 0 && (
        <div className="users__table-wrap">
          <table className="users__table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUT</th>
                <th>Correo</th>
                <th>Rol</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="users__name-cell">
                      <span className="users__avatar">
                        {u.firstName[0]}{u.lastName[0]}
                      </span>
                      <Link to={`/admin/usuarios/${u.id}`} className="users__name-link">
                        {u.firstName} {u.lastName}
                      </Link>
                    </div>
                  </td>
                  <td className="mono">{u.rut}</td>
                  <td>{u.email}</td>
                  <td>
                    {tab === 'active' ? (
                      <select
                        className="users__role-select"
                        value={u.role}
                        disabled={roleMutation.isPending}
                        onChange={(e) => roleMutation.mutate({ user: u, role: e.target.value as Role })}
                      >
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span>{ROLE_LABELS[u.role]}</span>
                    )}
                  </td>
                  <td>
                    <div className="users__actions">
                      <Link to={`/admin/usuarios/${u.id}`} className="users__detail-link">Ver ficha</Link>
                      {tab === 'active' ? (
                        <button
                          type="button"
                          className="users__delete"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`¿Eliminar a ${u.firstName} ${u.lastName}?`)) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                        >
                          Eliminar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="users__restore"
                          disabled={restoreMutation.isPending}
                          onClick={() => {
                            if (confirm(`¿Reactivar a ${u.firstName} ${u.lastName}?`)) {
                              restoreMutation.mutate(u.id);
                            }
                          }}
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}