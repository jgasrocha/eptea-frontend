import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import Swal from 'sweetalert2';
import NavBar from '../../layouts/Navbar';
import Sidebar from '../../layouts/Sidebar';
import { useAuth } from "../../context/AuthContext";

// --- QUERIES E MUTATIONS ---
const GET_STAFF_DATA = gql`
  query GetStaffData {
    usersByInstitution { id firstName lastName userType username profileImage isActive }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($reg: String!, $type: String!, $instId: ID) {
    createUser(registrationNumber: $reg, userType: $type, institutionId: $instId) {
      user { id username }
    }
  }
`;

const TOGGLE_USER_STATUS = gql`
  mutation ToggleUser($id: ID!, $isActive: Boolean!) {
    toggleUserStatus(id: $id, isActive: $isActive) {
      success
    }
  }
`;

// --- NOVA MUTATION DE EDIÇÃO DE PAPEL ---
const UPDATE_STAFF_ROLE = gql`
  mutation UpdateStaffRole($id: ID!, $userType: String!) {
    updateStaffRole(id: $id, userType: $userType) {
      success
      message
    }
  }
`;

export default function StaffList() {
  const { user: me, loading: authLoading } = useAuth();
  const { data, loading, refetch, error } = useQuery(GET_STAFF_DATA);
  
  const [createUser] = useMutation(CREATE_USER);
  const [toggleUser] = useMutation(TOGGLE_USER_STATUS);
  const [updateRole] = useMutation(UPDATE_STAFF_ROLE); // Hook da nova mutation
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [form, setForm] = useState({ reg: '', type: 'teacher' });

  // Estados para o Modal de Edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', type: '' });

  if (loading || authLoading) return <div className="h-screen flex items-center justify-center font-black text-slate-300 animate-pulse text-xl">EPTEA: CARREGANDO DOCENTES...</div>;
  if (error) return <p className="p-20 text-center text-red-500 font-bold">Erro: {error.message}</p>;

  const allStaff = (data?.usersByInstitution || []).filter(u => {
    if (me?.userType === 'management') return u.userType === 'teacher' || u.userType === 'aee';
    if (me?.userType === 'aee') return u.userType === 'teacher';
    return false;
  });

  const activeStaff = allStaff.filter(u => u.isActive);
  const inactiveStaff = allStaff.filter(u => !u.isActive);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createUser({ variables: { reg: form.reg, type: form.type, instId: me.institution.id } });
      Swal.fire('Sucesso!', 'Profissional cadastrado.', 'success');
      setIsModalOpen(false); setForm({ reg: '', type: 'teacher' }); refetch();
    } catch (err) { Swal.fire('Erro', err.message, 'error'); }
  };

  const handleToggleStatus = async (userId, status) => {
    try {
      await toggleUser({ variables: { id: userId, isActive: status } });
      Swal.fire('Sucesso!', status ? 'Profissional ativado.' : 'Profissional inativado.', 'success');
      refetch();
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  };

  // --- NOVA FUNÇÃO: SALVAR EDIÇÃO DE PAPEL ---
  const handleEditRole = async (e) => {
    e.preventDefault();
    try {
      await updateRole({ variables: { id: editForm.id, userType: editForm.type } });
      Swal.fire('Sucesso!', 'Papel do profissional atualizado.', 'success');
      setIsEditModalOpen(false);
      refetch();
    } catch (err) {
      Swal.fire('Erro', err.message, 'error');
    }
  };

  // Abre o modal preenchendo com os dados atuais do professor
  const openEditModal = (staff) => {
    setEditForm({ id: staff.id, type: staff.userType });
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <NavBar user={me} />
      <div className="flex">
        <Sidebar user={me} />
        <main className="flex-1 p-6 md:p-10 max-w-7xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <h2 className="text-4xl font-black text-slate-800 italic tracking-tighter">Corpo Docente</h2>
            
            <div className="flex gap-3">
              {inactiveStaff.length > 0 && (
                <button 
                  onClick={() => setShowInactiveModal(true)} 
                  className="bg-slate-200 text-slate-700 px-6 py-4 rounded-3xl font-bold hover:bg-slate-300 transition-colors"
                >
                  Inativos ({inactiveStaff.length})
                </button>
              )}
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                ➕ Novo Profissional
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeStaff.map(u => (
              <div key={u.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                
                {/* BOTÕES DE AÇÃO NO CARD */}
                <div className="absolute top-6 right-6 flex gap-3 z-20">
                  {/* Edição de papel permitida apenas para Gestão */}
                  {me?.userType === 'management' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(u); }} 
                      className="text-blue-400 hover:text-blue-600 text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                      Editar
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(u.id, false); }} 
                    className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Inativar
                  </button>
                </div>

                <div className="flex items-center gap-5">
                  {u.profileImage ? (
                    <img src={u.profileImage} className="w-20 h-20 rounded-3xl object-cover shadow-sm" alt="Staff" />
                  ) : (
                    <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl font-black">{u.firstName?.charAt(0) || u.username.charAt(0)}</div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl leading-tight">{u.firstName ? `${u.firstName} ${u.lastName}` : u.username}</h3>
                    <p className="text-xs text-slate-400 font-mono italic">@{u.username}</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Função</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${u.userType === 'aee' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {u.userType === 'aee' ? 'Especialista AEE' : 'Prof. Regular'}
                  </span>
                </div>
              </div>
            ))}
            
            {activeStaff.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-400 font-bold">Nenhum profissional ativo no momento.</p>
              </div>
            )}
          </div>

          {/* MODAL NOVO PROFISSIONAL */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-200">
                <h3 className="text-2xl font-black mb-2 text-slate-800">Cadastrar Docente</h3>
                <p className="text-slate-400 text-xs mb-8 uppercase font-bold tracking-widest">Controle Institucional</p>
                <form onSubmit={handleCreate} className="space-y-6">
                  <input className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" value={form.reg} onChange={e => setForm({...form, reg: e.target.value})} placeholder="Matrícula / Usuário" required />
                  <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="teacher">Professor Regular</option>
                    {me?.userType === 'management' && <option value="aee">Especialista AEE</option>}
                  </select>
                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100">Confirmar</button>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL EDITAR PROFISSIONAL */}
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-200">
                <h3 className="text-2xl font-black mb-2 text-slate-800">Editar Papel</h3>
                <p className="text-slate-400 text-xs mb-8 uppercase font-bold tracking-widest">Atualização de Função</p>
                <form onSubmit={handleEditRole} className="space-y-6">
                  <select 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-inner" 
                    value={editForm.type} 
                    onChange={e => setEditForm({...editForm, type: e.target.value})}
                  >
                    <option value="teacher">Professor Regular</option>
                    <option value="aee">Especialista AEE</option>
                  </select>
                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100">Salvar</button>
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold">Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL PROFISSIONAIS INATIVOS */}
          {showInactiveModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
                <h3 className="text-2xl font-black mb-6 text-slate-800 italic">Profissionais Inativos</h3>
                
                <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                  {inactiveStaff.map(u => (
                    <div key={u.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-700 block text-lg">{u.firstName ? `${u.firstName} ${u.lastName}` : u.username}</span>
                        <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
                          @{u.username} • {u.userType === 'aee' ? 'AEE' : 'Prof. Regular'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleToggleStatus(u.id, true)} 
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        Ativar
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setShowInactiveModal(false)} 
                  className="mt-8 w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}