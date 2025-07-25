import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
    return (
        <div className="max-w-4xl mx-auto">
             <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Terms & Conditions</h1>
                <p className="text-muted-foreground mt-2">Last updated: [Date]</p>
            </div>
            
            <Card>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">1. Introduction</h2>
                        <p className="text-muted-foreground">
                            Welcome to Nexbattle. These are the terms and conditions governing your access to and use of the website Nexbattle, including any content, functionality and services offered on or through Nexbattle. Please read the Terms of Service carefully before you start to use the Site.
                        </p>
                         <p className="text-destructive font-semibold">
                            This is placeholder text. You must replace this with your own official Terms & Conditions.
                        </p>
                    </div>

                     <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">2. User Accounts</h2>
                        <p className="text-muted-foreground">
                            To access most features of the Site, you must register for an account. When you register for an account, you may be required to provide us with some information about yourself, such as your email address or other contact information. You agree that the information you provide to us is accurate and that you will keep it accurate and up-to-date at all times.
                        </p>
                    </div>

                     <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">3. Financial Transactions</h2>
                        <p className="text-muted-foreground">
                            All financial transactions made through the platform are final. We are not responsible for any loss of funds due to user error, network issues, or any other reason. The company reserves the right to manage payouts, commissions, and wagers according to the rules outlined in the "About Us" section.
                        </p>
                    </div>
                    
                     <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">4. Prohibited Conduct</h2>
                        <p className="text-muted-foreground">
                            By using the Site you agree not to: use the Site for any illegal purpose, or in violation of any local, state, national, or international law; violate, or encourage others to violate, any right of a third party, including by infringing or misappropriating any third party intellectual property right; post, upload, or distribute any User Content or other content that is unlawful, defamatory, libelous, inaccurate, or that a reasonable person could deem to be objectionable, profane, indecent, pornographic, harassing, threatening, embarrassing, hateful, or otherwise inappropriate.
                        </p>
                    </div>

                     <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">5. Termination of Use</h2>
                        <p className="text-muted-foreground">
                           We may, in our sole discretion, suspend or terminate your access to all or part of the Site with or without notice and for any reason, including, without limitation, breach of these Terms of Service.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
