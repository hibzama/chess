
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getCountFromServer, collection, getDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ban } from "lucide-react";
import { boyAvatars, girlAvatars } from "@/components/icons/avatars";
import { renderToString } from "react-dom/server";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import RegisterForm from "./register-form";


export default function RegisterPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <RegisterForm />
            </Suspense>
        </div>
    )
}
