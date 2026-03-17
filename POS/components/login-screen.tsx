"use client"

import { useState } from "react"
import type { User, UserRole } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { UserCircle, Shield, Users } from "lucide-react"

interface LoginScreenProps {
  users: User[]
  onLogin: (user: User) => void
}

export function LoginScreen({ users, onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<"select" | "login">("select")
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setMode("login")
    setPin("")
    setError("")
  }

  const handlePinSubmit = () => {
    const user = users.find((u) => u.role === selectedRole && u.pin === pin)
    if (user) {
      onLogin(user)
    } else {
      setError("PIN incorrecto. Intenta de nuevo.")
      setPin("")
    }
  }

  const handleKeyPress = (key: string) => {
    if (key === "del") {
      setPin((prev) => prev.slice(0, -1))
    } else if (pin.length < 4) {
      setPin((prev) => prev + key)
    }
  }

  const handleBack = () => {
    setMode("select")
    setSelectedRole(null)
    setPin("")
    setError("")
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20pantalla%202026-03-16%20a%20la%28s%29%204.57.42%E2%80%AFp.%C2%A0m.-GNN97ECZah8oBuwyg4QJsUGeewX9cX.png"
            alt="El Jardín de los Conejos"
            className="w-48 h-48 object-contain rounded-full bg-card shadow-lg"
          />
        </div>

        <Card className="border-2 border-primary shadow-xl">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="text-center text-xl">
              {mode === "select" ? "Bienvenido" : `Ingreso ${selectedRole === "supervisor" ? "Supervisor" : "Empleado"}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {mode === "select" ? (
              <div className="space-y-4">
                <p className="text-center text-foreground mb-6">
                  Selecciona tu tipo de cuenta
                </p>
                <Button
                  onClick={() => handleRoleSelect("supervisor")}
                  className="w-full h-16 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Shield className="mr-3 h-6 w-6" />
                  Supervisor
                </Button>
                <Button
                  onClick={() => handleRoleSelect("empleado")}
                  className="w-full h-16 text-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Users className="mr-3 h-6 w-6" />
                  Empleado
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <UserCircle className="h-16 w-16 text-primary" />
                </div>

                {/* PIN Display */}
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-12 h-12 border-2 border-primary rounded-lg flex items-center justify-center text-2xl font-bold bg-card text-foreground"
                    >
                      {pin[i] ? "●" : ""}
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="text-accent text-center text-sm">{error}</p>
                )}

                {/* PIN Pad */}
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
                    (key) => (
                      <Button
                        key={key}
                        onClick={() => key && handleKeyPress(key)}
                        disabled={!key}
                        variant={key === "del" ? "outline" : "secondary"}
                        className={`h-14 text-xl font-semibold ${
                          !key ? "invisible" : ""
                        } ${key === "del" ? "text-accent" : "text-foreground"}`}
                      >
                        {key === "del" ? "⌫" : key}
                      </Button>
                    )
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 border-primary text-primary hover:bg-primary/10"
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={handlePinSubmit}
                    disabled={pin.length !== 4}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Ingresar
                  </Button>
                </div>

                {/* Demo hint */}
                <p className="text-xs text-center text-muted-foreground">
                  {selectedRole === "supervisor"
                    ? "Demo: PIN 1234"
                    : "Demo: PIN 1111, 2222, o 3333"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-foreground mt-4">
          @jardindelosconejosalamoexpress
        </p>
      </div>
    </main>
  )
}
