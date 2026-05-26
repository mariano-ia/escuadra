import { SearchClient } from "./search-client";

export default function BuscarPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl mb-6">Buscar</h1>
      <SearchClient />
      <p className="text-xs text-grey-light mt-4">
        Busca en notas, audios transcriptos y cotizaciones de todas tus obras. Resultados en vivo
        mientras escribís.
      </p>
    </div>
  );
}
