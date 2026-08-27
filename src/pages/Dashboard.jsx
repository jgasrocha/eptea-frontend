import React, { useMemo } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import NavBar from "../layouts/Navbar";
import Sidebar from "../layouts/Sidebar";
import { useAuth } from "../context/AuthContext";

/* ================= QUERIES E MUTATIONS ================= */

const GET_DASHBOARD_STATS = gql`
  query DashboardStats {
    dashboardStats
  }
`;

const GET_NOTIFICATIONS = gql`
  query Notifications {
    myNotifications {
      id
      message
      changeLevel
      createdAt
      student {
        id
        firstName
        lastName
      }
      isRead
    }
  }
`;

const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      success
    }
  }
`;

export default function Dashboard() {
  const { user, loading: userLoading } = useAuth();

  // Query de Estatísticas
  const { data: statsData, refetch: refetchStats } = useQuery(GET_DASHBOARD_STATS, {
    fetchPolicy: "network-only",
  });

  // Query do Mural (Polling a cada 60 segundos para poupar o servidor)
  const { data: notificationsData, refetch: refetchNotifications } = useQuery(GET_NOTIFICATIONS, {
    pollInterval: 60000,
    fetchPolicy: "network-only",
  });

  const [markAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead({ variables: { id } });
      // Atualiza o mural e o contador numérico instantaneamente
      refetchNotifications();
      refetchStats();
    } catch (e) {
      console.error("Erro ao marcar notificação:", e);
    }
  };

  /* ================= PROCESSAMENTO DE DADOS ================= */

  // Faz o parse do JSON vindo do Django e define valores padrão para evitar erros
  const stats = useMemo(() => {
    const defaultStats = {
      totalStudents: 0,
      totalTeachers: 0,
      notificationsCount: 0,
      pendingPeis: 0, // Novo: Radar de PEIs Pendentes
      invisibleStudents: 0, // Novo: Termômetro de Invisíveis
      totalSubjects: 0,
      totalClasses: 0,
      totalCourses: 0,
    };

    if (!statsData?.dashboardStats) return defaultStats;

    try {
      const parsed =
        typeof statsData.dashboardStats === "string"
          ? JSON.parse(statsData.dashboardStats)
          : statsData.dashboardStats;

      return {
        ...defaultStats,
        ...parsed,
      };
    } catch (e) {
      console.error("Erro no processamento das estatísticas:", e);
      return defaultStats;
    }
  }, [statsData]);

  const notifications = notificationsData?.myNotifications || [];
  const isTeacher = user?.userType === "teacher";

  if (userLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-black text-slate-300 animate-pulse uppercase tracking-widest">
        Sincronizando Dashboard...
      </div>
    );
  }

  /* ================= RENDERIZAÇÃO ================= */

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <NavBar user={user} />

      <div className="flex">
        <Sidebar user={user} />

        <main className="flex-1 p-6 md:p-10 max-w-7xl">
          {/* HEADER */}
          <header className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 italic">
              Painel de Controle
            </h1>
            <p className="text-slate-500 font-medium">
              {user?.institution?.name} • Gestão de Inclusão
            </p>
          </header>

          {/* CARDS DE RESUMO (Condicionais por tipo de usuário) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {isTeacher ? (
              <>
                {/* Professor vê os PEIs pendentes */}
                <StatCard
                  title="Planos Pendentes"
                  value={stats.pendingPeis}
                  detail="Falta criar ou atualizar PEI"
                  icon="⚠️"
                  color={stats.pendingPeis > 0 ? "red" : "emerald"}
                />
                <StatCard
                  title="Minhas Disciplinas"
                  value={stats.totalSubjects}
                  detail="Componentes ativos"
                  icon="📘"
                  color="indigo"
                />
                <StatCard
                  title="Alertas"
                  value={stats.notificationsCount}
                  detail="Atualizações não lidas"
                  icon="🔔"
                  color="blue"
                />
              </>
            ) : (
              <>
                <StatCard
                  title="Alunos TEA"
                  value={stats.totalStudents}
                  detail="Total da instituição"
                  icon="🎓"
                  color="indigo"
                />
                {/* Gestão vê os alunos invisíveis */}
                <StatCard
                  title="Alunos Invisíveis"
                  value={stats.invisibleStudents}
                  detail="Sem acompanhamento > 15 dias"
                  icon="🧊"
                  color={stats.invisibleStudents > 0 ? "amber" : "emerald"}
                />
                <StatCard
                  title="Alertas Não Lidos"
                  value={stats.notificationsCount} 
                  detail="Avisos do mural"
                  icon="🔔"
                  color="blue"
                />
              </>
            )}
          </div>

          {/* MURAL DE ATUALIZAÇÕES (NOTIFICAÇÕES DO AEE) */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-800 italic text-center md:text-left">
                Mural de Atualizações
              </h2>
              <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest hidden md:block">
                Tempo Real
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-slate-400 font-bold italic">
                  Nenhuma movimentação pedagógica recente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-5 rounded-[2rem] border-l-8 transition-all hover:shadow-md relative ${
                      n.isRead ? "opacity-60 grayscale-[50%]" : ""
                    } ${
                      n.changeLevel === "HIGH"
                        ? "bg-red-50 border-red-500 shadow-red-50"
                        : n.changeLevel === "MEDIUM"
                        ? "bg-amber-50 border-amber-500 shadow-amber-50"
                        : "bg-slate-50 border-slate-300"
                    }`}
                  >
                    {/* Botão de Check (Só aparece se NÃO estiver lida) */}
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="absolute bottom-5 right-5 w-8 h-8 flex items-center justify-center bg-white rounded-full text-emerald-500 shadow hover:bg-emerald-50 hover:scale-110 transition-all"
                        title="Marcar como visto"
                      >
                        ✔️
                      </button>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                        {new Date(n.createdAt).toLocaleDateString()} •{" "}
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {n.changeLevel === "HIGH" && !n.isRead && (
                        <span className="text-red-500 animate-pulse">⚠️</span>
                      )}
                    </div>

                    <p
                      className={`text-sm font-bold leading-tight mb-4 ${
                        n.isRead ? "text-slate-500" : "text-slate-700"
                      }`}
                    >
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 bg-white/50 p-2 rounded-xl w-fit pr-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                        {n.student?.firstName?.[0] || "?"}
                      </div>
                      <span className="text-xs font-black text-slate-500 uppercase">
                        {n.student?.firstName} {n.student?.lastName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= COMPONENTE STATCARD ================= */

function StatCard({ title, value, detail, icon, color }) {
  const colors = {
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    red: "text-red-600 bg-red-50 border-red-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
  };

  const bgClasses = colors[color] ? colors[color].split(" ") : colors["indigo"].split(" ");

  return (
    <div
      className={`bg-white p-8 rounded-[2.5rem] border ${bgClasses[2]} shadow-sm transition-all hover:shadow-md`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm ${bgClasses[0]} ${bgClasses[1]}`}
      >
        {icon}
      </div>
      <p className="text-5xl font-black text-slate-800 tracking-tighter mb-1">
        {value}
      </p>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
        {title}
      </p>
      <p className="text-[10px] text-slate-300 font-bold italic mt-2">
        {detail}
      </p>
    </div>
  );
}