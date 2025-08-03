import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        HOMEBASE by
        <span class="font-bold"><span class="text-blue-600">Blue</span><span class="text-green-600">Green</span><span>Switch</span></span>
    </div>`
})
export class AppFooter {}
