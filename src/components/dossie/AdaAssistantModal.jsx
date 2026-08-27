// src/features/planning/AdaAssistantModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, gql } from "@apollo/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import Swal from "sweetalert2";

// Importação da logo do IF conforme sua estrutura de assets
import IF_LOGO from "../../assets/if.png";

// --- QUERIES & MUTATIONS ---
const GET_ADA_DATA = gql`
  query GetAda($sid: ID!, $subid: ID, $tid: ID) {
    adaHistory(studentId: $sid, subjectId: $subid, teacherId: $tid) {
      id question response createdAt
    }
    userById(id: $sid) {
      id firstName lastName username profileImage # Adicionado profileImage
      classGroup { name course { name } }
      teaProfile { 
        disabilityDescription
        challengesAndTriggers
        strengthsAndInterests
        pedagogicalGuidelines
      }
    }
    subjectAccessibilityPlan(studentId: $sid, subjectId: $subid, teacherId: $tid) {
      programmaticContent
      objectives
      methodology
      evaluation
    }
  }
`;

const ASK_ADA = gql`
  mutation AskAda($sid: ID!, $subid: ID, $tid: ID, $q: String!) {
    askAda(studentId: $sid, subjectId: $subid, teacherId: $tid, question: $q) {
      success
      interaction { id response }
    }
  }
`;

export default function AdaAssistantModal({ isOpen, onClose, studentId, subjectId, teacherId }) {
  const [question, setQuestion] = useState("");
  const bottomRef = useRef(null);
  const activeTeacherId = (teacherId === "null" || !teacherId) ? null : teacherId;

  const { data, refetch } = useQuery(GET_ADA_DATA, {
    variables: { sid: studentId, subid: subjectId, tid: activeTeacherId },
    skip: !isOpen,
    fetchPolicy: "network-only",
  });

  const [askAda, { loading: thinking }] = useMutation(ASK_ADA);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data, thinking]);

  const handleAsk = async () => {
    if (!question.trim() || thinking) return;
    const currentQ = question;
    setQuestion("");
    try {
      await askAda({ 
        variables: { sid: studentId, subid: subjectId, tid: teacherId, q: currentQ } 
      });
      refetch();
    } catch (e) {
      Swal.fire("Erro na Ada", e.message, "error");
    }
  };

  // --- LÓGICA DE IMPRESSÃO ESTILIZADA (LAYOUT ANEXO COM FOTO) ---
  const handlePrint = (aiResponseHTML) => {
    const s = data?.userById;
    const p = s?.teaProfile;
    const plan = data?.subjectAccessibilityPlan;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>PEI - ${s?.firstName} ${s?.lastName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; line-height: 1.4; }
            .header-pei { background-color: #92d050; border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 0; }
            .table-pei { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table-pei td { border: 1px solid #000; padding: 8px; font-size: 13px; vertical-align: top; }
            .label { font-weight: bold; display: block; margin-bottom: 2px; }
            .section-title { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; padding: 6px; border: 1px solid #000; margin-top: 15px; font-size: 13px; }
            .content-box { border: 1px solid #000; padding: 10px; min-height: 40px; font-size: 12px; margin-top: -1px; text-align: justify; }
            .if-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; border-bottom: 2px solid #00913f; padding-bottom: 10px; }
            .logo { height: 70px; }
            .student-photo { width: 100px; height: 120px; object-fit: cover; border: 1px solid #000; display: block; margin: 0 auto; }
            .ai-content table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .ai-content th { background-color: #92d050; border: 1px solid #000; padding: 6px; font-size: 11px; }
            .ai-content td { border: 1px solid #000; padding: 6px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="if-header">
            <img src="${IF_LOGO}" class="logo">
            <div style="text-align: right; font-size: 10px; font-weight: bold;">
              INSTITUTO FEDERAL BAIANO<br>PLANO DE ENSINO INDIVIDUALIZADO (PEI)
            </div>
          </div>

          <div class="header-pei">IDENTIFICAÇÃO DO (A) DISCENTE</div>
          <table class="table-pei">
            <tr>
              <td style="width: 75%;"><span class="label">Nome completo:</span> ${s?.firstName} ${s?.lastName}</td>
              <td rowspan="3" style="width: 25%; text-align: center; vertical-align: middle;">
                ${s?.profileImage 
                  ? `<img src="${s.profileImage}" class="student-photo">` 
                  : `<div style="font-size: 10px; color: #666; border: 1px dashed #ccc; height: 120px; display: flex; items-center; justify-content: center; flex-direction: column;">S/ FOTO</div>`
                }
              </td>
            </tr>
            <tr>
              <td><span class="label">Matrícula:</span> ${s?.username}</td>
            </tr>
            <tr>
              <td><span class="label">Curso:</span> ${s?.classGroup?.course?.name || 'Não informado'}</td>
            </tr>
          </table>

          <div class="section-title">PARTE I - CARACTERIZAÇÃO DO DISCENTE (AEE)</div>
          <div class="content-box">
            <span class="label">Descrição da Deficiência:</span> ${p?.disabilityDescription || 'Sem registros no dossiê.'}
          </div>
          <div class="content-box">
             <span class="label">Gatilhos e Dificuldades:</span> ${p?.challengesAndTriggers || 'Sem registros no dossiê.'}
          </div>
          <div class="content-box">
             <span class="label">Habilidades e Hiperfoco:</span> ${p?.strengthsAndInterests || 'Sem registros no dossiê.'}
          </div>

          <div class="section-title">PARTE II - PLANO DE ACESSIBILIDADE (PROFESSOR)</div>
          <div class="content-box">
            <span class="label">Conteúdos Programáticos:</span> ${plan?.programmaticContent || 'Pendente de preenchimento.'}
          </div>
          <div class="content-box">
            <span class="label">Metodologia Sugerida:</span> ${plan?.methodology || 'Pendente de preenchimento.'}
          </div>

          <div class="ai-content">
            <div class="section-title">METAS, ESTRATÉGIAS E AVALIAÇÃO (ADAPTAÇÃO CURRICULAR)</div>
            ${aiResponseHTML}
          </div>
          
          <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 10px;">
             <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Assinatura AEE / NAPNE</div>
             <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px;">Assinatura Docente</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    // Pequeno delay para garantir que a imagem do aluno carregue antes da janela de impressão
    setTimeout(() => printWindow.print(), 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-end p-4 md:p-10 bg-slate-900/20 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#00913f]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-lg">
              <span className="animate-pulse text-white">✨</span>
            </div>
            <div>
              <h3 className="font-black text-white">Assistente Ada</h3>
              <p className="text-[9px] text-white/70 font-black uppercase tracking-widest">Inclusão Inteligente IF Baiano</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-black/10 text-white flex items-center justify-center font-bold">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
          {data?.adaHistory.map((item) => (
            <div key={item.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-[#00913f] text-white p-4 rounded-2xl rounded-br-none max-w-[85%] text-sm shadow-md">
                  {item.question}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-700 p-5 rounded-2xl rounded-tl-none shadow-sm w-full max-w-[95%]">
                  <div className="text-[9px] font-bold uppercase mb-2 text-[#00913f]">Ada</div>
                  <div id={`ada-response-${item.id}`} className="text-sm prose prose-slate max-w-none prose-table:border prose-table:border-slate-200">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h3: ({node, ...props}) => <div className="font-black uppercase text-xs bg-slate-100 p-2 my-4 border-l-4 border-[#00913f]" {...props} />,
                        a: ({node, ...props}) => <a className="text-[#00913f] font-black underline hover:text-green-800" target="_blank" rel="noopener noreferrer" {...props} />,
                        table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse border border-slate-300" {...props} /></div>,
                        th: ({node, ...props}) => <th className="border border-slate-300 bg-slate-50 p-2 text-[10px]" {...props} />,
                        td: ({node, ...props}) => <td className="border border-slate-300 p-2 text-[10px]" {...props} />,
                        strong: ({node, ...props}) => <b className="font-black text-slate-900" {...props} />,
                      }}
                    >
                      {item.response}
                    </ReactMarkdown>
                  </div>
                  {(item.response.length > 200 || item.response.toLowerCase().includes('pei')) && (
                    <button 
                      onClick={() => handlePrint(document.getElementById(`ada-response-${item.id}`).innerHTML)}
                      className="mt-4 flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-[#00913f] uppercase transition-colors pt-4 border-t border-slate-50 w-full"
                    >
                      <span>🖨️</span> Exportar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="p-5 bg-white border-t border-slate-100">
          <div className="relative">
            <textarea
              className="w-full pl-6 pr-14 py-4 bg-slate-50 rounded-3xl border-none focus:ring-2 focus:ring-[#00913f] outline-none text-sm text-slate-700 resize-none shadow-inner"
              placeholder="Ex: Gere a tabela de metas para o PEI..."
              rows="1"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            />
            <button
              onClick={handleAsk}
              disabled={thinking || !question.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#00913f] text-white w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-green-700 transition-all disabled:bg-slate-200 shadow-lg"
            >
              {thinking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "➤"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}