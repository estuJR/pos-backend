"use client"

import { useState } from "react"
import { LoginScreen } from "@/components/login-screen"
import { POSScreen } from "@/components/pos-screen"
import { SwitchEmployeeModal } from "@/components/switch-employee-modal"

export type UserRole = "supervisor" | "empleado"

export interface User {
  name: string
  role: UserRole
  pin: string
}

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  image?: string
}

export interface TableOrder {
  tableNumber: number
  items: OrderItem[]
  status: "activa" | "para_pagar" | "pagada"
}

// Demo users for the system
const DEMO_USERS: User[] = [
  { name: "Carlos Supervisor", role: "supervisor", pin: "1234" },
  { name: "María Empleada", role: "empleado", pin: "1111" },
  { name: "Juan Empleado", role: "empleado", pin: "2222" },
  { name: "Ana Empleada", role: "empleado", pin: "3333" },
]

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showSwitchModal, setShowSwitchModal] = useState(false)

  const handleLogin = (user: User) => {
    setCurrentUser(user)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  const handleSwitchEmployee = (user: User) => {
    setCurrentUser(user)
    setShowSwitchModal(false)
  }

  // Get only employees for switching (no supervisors)
  const employeesOnly = DEMO_USERS.filter((u) => u.role === "empleado")

  if (!currentUser) {
    return <LoginScreen users={DEMO_USERS} onLogin={handleLogin} />
  }

  return (
    <>
      <POSScreen
        user={currentUser}
        onLogout={handleLogout}
        onSwitchEmployee={() => setShowSwitchModal(true)}
      />
      {showSwitchModal && (
        <SwitchEmployeeModal
          employees={employeesOnly}
          currentUser={currentUser}
          onSwitch={handleSwitchEmployee}
          onClose={() => setShowSwitchModal(false)}
        />
      )}
    </>
  )
}
