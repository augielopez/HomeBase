import { Component, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import mermaid from 'mermaid';

@Component({
  selector: 'app-money-flow',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, ToastModule],
  templateUrl: './money-flow.component.html',
  styleUrls: ['./money-flow.component.scss']
})
export class MoneyFlowComponent implements AfterViewInit {
  loading = false;
  chart = `
  graph TD

    %% --- Style Definitions ---
    classDef income fill:#c6f6d5,stroke:#2f855a,stroke-width:2px,rx:10,ry:10;
    classDef bank fill:#bee3f8,stroke:#2b6cb0,stroke-width:2px,rx:10,ry:10;
    classDef expense fill:#fed7d7,stroke:#c53030,stroke-width:2px,rx:10,ry:10;
    classDef investment fill:#fefcbf,stroke:#d69e2e,stroke-width:2px,rx:10,ry:10;

    %% --- Income Nodes ---
    SuitOne["**SuitOne - Rent 🏡💰**<br/>Net Deposit"]
    Centene["**Centene 💼💰**<br/>Net Deposit"]
    Orion["Orion 💼💰"]
    RealBroker["**Real Broker 🏠🪧💰**<br/>Net Deposit"]
    class SuitOne,Centene,Orion,RealBroker income;

    %% --- Bank Accounts (stacked) ---
    Fidelity["Fidelity 🏦"]
    MelissaFT["Melissa First Tech 🏦"]
    AugieFT["Augie First Tech 🏦"]
    NonMonthlyFT["Non-Monthly First Tech 🏦"]
    Marcus["Marcus 🏦"]
    class Fidelity,MelissaFT,AugieFT,NonMonthlyFT,Marcus bank;
    
    %% --- Investment Node ---
    Vanguard["Vanguard 💹"]
    Coinbase["Coinbase 💹"]
    class Vanguard,Coinbase investment;
    
     %% --- Add Credit Card node ---
    USBankCC["US Bank CC 💳"]

    %% --- Expense Nodes ---
    Groceries["Groceries 🛒"]
    Gas["Gas ⛽"]
    Bills["Bills 🧾"]
    NonMonthlyBills["Non Monthly Bills 🧾"]
    class Groceries,Gas,Bills,NonMonthlyBills,USBankCC expense;

    %% --- Connections from Income to Banks ---
    Orion --> |"$X"|Fidelity
    Orion --> |"1000"|MelissaFT
    Orion -->|"250"|AugieFT
    Orion --> |"$750"|NonMonthlyFT
    Centene --> Fidelity
    SuitOne --> Fidelity
    RealBroker --> Fidelity
    Fidelity --> |"$X"|USBankCC
    USBankCC --> |"$X"|Bills

    %% --- Expense Connection ---
    MelissaFT --> |"$600"|Groceries
    MelissaFT --> |"$400"|Gas
    AugieFT --> |"$250"|Gas
    Fidelity --> |"$X"|Bills
    Fidelity --> |"$1000"|Marcus
    NonMonthlyFT --> |"$X"|NonMonthlyBills
    
    %% --- Investment Connection ---
    Marcus --> |"$400"|Vanguard
    Marcus --> |"$400"|Coinbase
    
    %% --- Clickable Nodes ---
    click Bills "http://localhost:4200/#/apps/bills" _blank
    click NonMonthlyBills "http://localhost:4200/#/apps/bills" _blank
    click Fidelity "https://fidelity.com" _blank
    click MelissaFT "https://banking.firsttechfed.com/Authentication" _blank
    click AugieFT "https://banking.firsttechfed.com/Authentication" _blank
    click NonMonthlyFT "https://banking.firsttechfed.com/Authentication" _blank
    click Marcus "https://www.marcus.com/us/en/login" _blank
    click USBankCC "https://www.usbank.com/index.html" _blank
    click Vanguard "https://logon.vanguard.com/logon" _blank
    click Coinbase "https://login.coinbase.com/signin?client_id=258660e1-9cfe-4202-9eda-d3beedb3e118&oauth_challenge=e466ae8c-54ac-4b0b-ac50-32cb3b9eeabf" _blank
    click SuitOne "https://sayland.appfolio.com/connect/users/sign_in?a=cw&utm_source=apmsites_v3&utm_campaign=tportal_login" _blank
      
    %% --- Layout: Force income sources in left-to-right order ---
    RealBroker --> Centene
    Centene --> SuitOne
    SuitOne --> Orion
    
    %% Hide layout lines visually
    linkStyle 17 stroke:transparent
    linkStyle 18 stroke:transparent
    linkStyle 19 stroke:transparent

`;

  ngAfterViewInit(): void {
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
    mermaid.contentLoaded();

    // Apply target="_blank" to all Mermaid <a> links
    setTimeout(() => {
      const links = document.querySelectorAll('.mermaid a');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('http')) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
      });
    }, 0);
  }
}
