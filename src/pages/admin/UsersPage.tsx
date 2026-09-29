import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteUser, getUsers, updateUser } from '../../api/users';
import type { Role } from '../../types/auth';
import type { User } from '../../types/user';
import './UsersPage.css';

type RoleFilter = Role | 'TODOS';
const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Admin', EMPLOYEE: 'Empleado', CLIENT: 'Cliente' };

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isPending, isError, error } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const [filter, setFilter] = useState<RoleFilter>('TODOS');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const roleMutation = useMutation({
    mutationFn: ({ user, role }: { user: User; role: Role }) =>
      updateUser(user.id, { ...user, role }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: invalidate,
  });

  const filtered = users.filter((u) => filter === 'TODOS' || u.role === filter);

  return (
    <section className="users">
      <div className="users__intro">
        <div>
          <h1>Usuarios</h1>
          <p>Clientes y personal con sus roles de acceso.</p>
        </div>
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

      {isPending && <p className="users__state">Cargando usuarios…</p>}
      {isError && <p className="users__state users__state--error">{error.message}</p>}

      {!isPending && !isError && (
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
                  </td>
                  <td>
                    <div className="users__actions">
                      <Link to={`/admin/usuarios/${u.id}`} className="users__detail-link">Ver ficha</Link>
                      <button
                        type="button"
                        className="users__delete"
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${u.firstName} ${u.lastName}?`)) {
                            deleteMutation.mutate(u.id);
                          }
                        }}
                      >
                        Eliminar
                      </button>
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