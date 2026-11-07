import { useEffect, useState } from 'react';

type Order = { id: number; customer: string; status: string; total: number; created_at: string };

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/orders')
      .then((r) => r.json())
      .then(setOrders);
  }, []);

  const visible = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((o) => JSON.stringify(o).toLowerCase().includes(query.toLowerCase()));

  return (
    <main>
      <h1>Orders</h1>
      <input aria-label="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <table>
        <tbody>
          {visible.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.customer}</td>
              <td>{o.status}</td>
              <td>{o.total.toFixed(2)}</td>
              <td>{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
