
'use client';
import DynamicRegisterForm from "./dynamic-register-form";
import { Suspense } from "react";

export default function RegisterPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
             <Suspense>
                <DynamicRegisterForm />
            </Suspense>
        </div>
    );
}
