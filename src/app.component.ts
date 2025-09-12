
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MasterDataService } from './app/pages/service/master-data.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    providers: [MasterDataService],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
    constructor(private masterDataService: MasterDataService) {}

    async ngOnInit(): Promise<void> {
        try {
            console.log('Initializing application...');
            await this.masterDataService.loadAllMasterData().toPromise();
            console.log('Application initialization complete');
        } catch (error) {
            console.error('Error during application initialization:', error);
        }
    }
}
