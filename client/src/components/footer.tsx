import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="text-primary-foreground h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Women's Money Matters</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Empowering women & girls to improve their financial health to create a more secure future for their families & communities.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Volunteer Opportunities</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Our Programs</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Get Involved</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Financial Futures Program</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Life Launch Collective</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-3">Connect With Us</h4>
            <div className="flex space-x-3">
              <a href="#" className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                <span className="text-sm text-muted-foreground">f</span>
              </a>
              <a href="#" className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                <span className="text-sm text-muted-foreground">t</span>
              </a>
              <a href="#" className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                <span className="text-sm text-muted-foreground">i</span>
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Women's Money Matters. All rights reserved. Integrated with Salesforce for seamless volunteer management.</p>
        </div>
      </div>
    </footer>
  );
}
