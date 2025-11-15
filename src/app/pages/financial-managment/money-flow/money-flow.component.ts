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
    Marcus["Marcus 🏦"]
    class Fidelity,MelissaFT,AugieFT,Marcus bank;
    
    %% --- Investment Node ---
    Vanguard["Vanguard 💹"]
    Coinbase["Coinbase 💹"]
    class Vanguard,Coinbase investment;
    
    %% --- Credit Card node ---
    USBankCC["US Bank CC 💳"]

    %% --- Expense Nodes ---
    Groceries["Groceries 🛒"]
    Gas["Gas ⛽"]
    Bills["Bills 🧾"]
    class Groceries,Gas,Bills,USBankCC expense;

    %% --- Connections from Income to Banks ---
    Orion --> |"$X"|Fidelity
    Orion --> |"1000"|MelissaFT
    Centene --> Fidelity
    SuitOne --> Fidelity
    RealBroker --> Fidelity
    Fidelity --> |"$X"|USBankCC
    USBankCC --> |"$X"|Bills

    %% --- Expense Connections ---
    MelissaFT --> |"$600"|Groceries
    MelissaFT --> |"$400"|Gas
    Fidelity --> |"$X"|Bills
    Fidelity --> |"$1000"|Marcus
    
    %% --- Investment Connections ---
    Marcus --> |"$400"|Vanguard
    Marcus --> |"$400"|Coinbase
    
    %% --- Clickable Nodes ---
    click Bills href "http://localhost:4200/#/apps/bills" "Open Bills" _blank
    click Fidelity href "https://fidelity.com" "Open Fidelity" _blank
    click MelissaFT href "https://banking.firsttechfed.com/Authentication" "Open First Tech (Melissa)" _blank
    click AugieFT href "https://banking.firsttechfed.com/Authentication" "Open First Tech (Augie)" _blank
    click Marcus href "https://www.marcus.com/us/en/login" "Open Marcus" _blank
    click USBankCC href "https://www.usbank.com/index.html" "Open US Bank CC" _blank
    click Vanguard href "https://logon.vanguard.com/logon" "Open Vanguard" _blank
    click Coinbase href "https://login.coinbase.com/signin" "Open Coinbase" _blank
    click SuitOne href "https://sayland.appfolio.com/connect/users/sign_in" "Open SuitOne" _blank
      
    %% --- Layout: Force income sources in left-to-right order ---
    RealBroker --> Centene
    Centene --> SuitOne
    SuitOne --> Orion
    
    %% Hide layout line visually (adjust index if needed)
    linkStyle 13 stroke:transparent
    linkStyle 14 stroke:transparent
    linkStyle 15 stroke:transparent
  `

  ngAfterViewInit(): void {
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 150,   // more horizontal space between nodes
        rankSpacing: 100   // more vertical space between layers
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
