import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoneyFlowComponent } from './money-flow.component';

describe('MoneyFlowComponent', () => {
  let component: MoneyFlowComponent;
  let fixture: ComponentFixture<MoneyFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoneyFlowComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MoneyFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

