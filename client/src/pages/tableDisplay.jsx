import React from "react";
import Template1 from "../components/templates/TabelaTemplate1";
import Template2 from "../components/templates/TabelaTemplate2";

export default function TabelaPdf({
  templateType = 1,
  data,
  dataObs,
  handleChangeMain,
  handleChangeObs,
  handleChange,
  headers,
  headersObs,
  donoProcesso,
  donoProcessoOriginal,
  setDonoProcesso,
  objetivoProcesso,
  setObjetivoProcesso,
  atividades,
  handleAtividadesChange,
  indicadores,
  handleIndicadoresChange,
  servicosEntrada,
  setServicosEntrada,
  servicoSaida,
  setServicoSaida,
  // Novas props opcionais para manipulação de linhas
  onMoveRowUp,
  onMoveRowDown,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onAddRowObs,
  onDeleteRowObs,
  // Props adicionais
  pathFilename = "",
  fieldNames = [],
  onSaveSuccess,
  getTablesHtml,
  obsTableRef,
  mainTableRef,
  // Novas props para manipulação de atividades no Template
  onMoveAtividadeUp,
  onMoveAtividadeDown,
  onInsertAtividadeAbove,
  onInsertAtividadeBelow,
  onDeleteAtividade,
  funcionarios = [], // Nova prop para funcionários
}) {
  const isTemplate2 = templateType === 2;

  // Funções de fallback para quando as props não forem fornecidas
  const handleMoveRowUp = onMoveRowUp || (() => {});
  const handleMoveRowDown = onMoveRowDown || (() => {});
  const handleInsertRowAbove = onInsertRowAbove || (() => {});
  const handleInsertRowBelow = onInsertRowBelow || (() => {});
  const handleDeleteRow = onDeleteRow || (() => {});
  const handleAddRowObs = onAddRowObs || (() => {});
  const handleDeleteRowObs = onDeleteRowObs || (() => {});

  // Funções de fallback para atividades
  const handleMoveAtividadeUp = onMoveAtividadeUp || (() => {});
  const handleMoveAtividadeDown = onMoveAtividadeDown || (() => {});
  const handleInsertAtividadeAbove = onInsertAtividadeAbove || (() => {});
  const handleInsertAtividadeBelow = onInsertAtividadeBelow || (() => {});
  const handleDeleteAtividade = onDeleteAtividade || (() => {});

 return (
    <div>
      {isTemplate2 ? (
        <Template2
          data={data}
          dataObs={dataObs}
          handleChange={handleChange}
          headers={headers}
          headersObs={headersObs}
          donoProcesso={donoProcesso}
          donoProcessoOriginal={donoProcessoOriginal}
          setDonoProcesso={setDonoProcesso}
          objetivoProcesso={objetivoProcesso}
          setObjetivoProcesso={setObjetivoProcesso}
          atividades={atividades}
          handleAtividadesChange={handleAtividadesChange}
          indicadores={indicadores}
          handleIndicadoresChange={handleIndicadoresChange}
          servicosEntrada={servicosEntrada}
          setServicosEntrada={setServicosEntrada}
          servicoSaida={servicoSaida}
          setServicoSaida={setServicoSaida}
          funcionarios={funcionarios}
          getTablesHtml={getTablesHtml}
          onMoveAtividadeUp={handleMoveAtividadeUp}
          onMoveAtividadeDown={handleMoveAtividadeDown}
          onInsertAtividadeAbove={handleInsertAtividadeAbove}
          onInsertAtividadeBelow={handleInsertAtividadeBelow}
          onDeleteAtividade={handleDeleteAtividade}
          pathFilename={pathFilename}
          onSaveSuccess={onSaveSuccess}
        />
      ) : (
        <Template1
          data={data}
          dataObs={dataObs}
          handleChange={handleChangeMain}
          handleChangeObs={handleChangeObs}
          templateType={templateType}
          servicosEntrada={servicosEntrada}
          servicoSaida={servicoSaida}
          setServicosEntrada={setServicosEntrada}
          setServicoSaida={setServicoSaida}
          onMoveRowUp={handleMoveRowUp}
          onMoveRowDown={handleMoveRowDown}
          onInsertRowAbove={handleInsertRowAbove}
          onInsertRowBelow={handleInsertRowBelow}
          onDeleteRow={handleDeleteRow}
          onAddRowObs={handleAddRowObs}
          onDeleteRowObs={handleDeleteRowObs}
          atividades={atividades}
          donoProcesso={donoProcesso}
          objetivoProcesso={objetivoProcesso}
          indicadores={indicadores}
          pathFilename={pathFilename}
          fieldNames={fieldNames}
          onSaveSuccess={onSaveSuccess}
          getTablesHtml={getTablesHtml}
          obsTableRef={obsTableRef}
          mainTableRef={mainTableRef}
        />
      )}
    </div>
  );
}

