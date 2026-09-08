import { useStall } from "../contexts/StallContext";

export default function PosPage() {
  const { stall } = useStall();
  return (
    <div className="page">
      <h1 className="page__title">POS</h1>
      <p>{stall ? `${stall.name} POS by Captura` : "SimplePOS"}</p>
    </div>
  );
}
