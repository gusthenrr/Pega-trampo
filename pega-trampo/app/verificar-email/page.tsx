import { Suspense } from "react"
import VerificarEmailClient from "./VerificarEmailClient"

export default function Page() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-700">
                    Carregando...
                </div>
            }
        >
            <VerificarEmailClient />
        </Suspense>
    )
}
