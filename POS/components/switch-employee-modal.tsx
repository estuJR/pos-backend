"use client"

import { useState } from "react"
import type { User } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCircle, X } from "lucide-react"

interface SwitchEmployeeModalProps {
  employees: User[]
  currentUser: User
  onSwitch: (user: User) => void
  onClose: () => void
}

export function SwitchEmployeeModal({
  employees,
  currentUser,
  onSwitch,
  onClose,
}: SwitchEmployeeModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")

  // Filter out current user
  const otherEmployees = employees.filter((e) => e.name !== currentUser.name)

  const handleKeyPress = (key: string) => {
    if (key === "del") {
      setPin((prev) => prev.slice(0, -1))
    } else if (pin.length < 4) {
      setPin((prev) => prev + key)
    }
  }

  const handlePinSubmit = () => {
    if (selectedEmployee && selectedEmployee.pin === pin) {
      onSwitch(selectedEmployee)
    } else {
      setError("PIN incorrecto")
      setPin("")
    }
  }

  const handleBack = () => {
    setSelectedEmployee(null)
    setPin("")
    setError("")
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md border-2 border-primary">
        <CardHeader className="bg-primary text-primary-foreground rounded-t-lg relative">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-5 w-5" />
          </Button>
          <CardTitle className="text-center">
            {selectedEmployee
              ? `Ingresar como ${selectedEmployee.name}`
              : "Cambiar de Empleado"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!selectedEmployee ? (
            <div className="space-y-3">
              <p className="text-center text-muted-foreground mb-4">
                Selecciona el empleado al que deseas cambiar
              </p>
              {otherEmployees.map((employee) => (
                <Button
                  key={employee.name}
                  onClick={() => setSelectedEmployee(employee)}
                  variant="outline"
                  className="w-full h-14 justify-start text-left border-primary hover:bg-primary/10"
                >
                  <UserCircle className="h-8 w-8 mr-3 text-primary" />
                  <span className="font-medium text-foreground">{employee.name}</span>
                </Button>
              ))}
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
                      className={`h-12 text-lg font-semibold ${
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
                  className="flex-1 border-primary text-foreground hover:bg-primary/10"
                >
                  Volver
                </Button>
                <Button
                  onClick={handlePinSubmit}
                  disabled={pin.length !== 4}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Confirmar
                </Button>
              </div>

              {/* Demo hint */}
              <p className="text-xs text-center text-muted-foreground">
                PIN de {selectedEmployee.name}: {selectedEmployee.pin}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
