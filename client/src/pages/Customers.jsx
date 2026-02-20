import { Users } from 'lucide-react'
import './Customers.css'

export default function Customers() {
    return (
        <div className="customers">
            <div className="page-header">
                <h1><Users size={24} /> Customers</h1>
            </div>

            <div className="placeholder-card card">
                <Users size={48} strokeWidth={1} />
                <h3>Customer Management</h3>
                <p>Customer tracking with loyalty points is available. Integrate with checkout to track spending and reward repeat customers.</p>
            </div>
        </div>
    )
}
