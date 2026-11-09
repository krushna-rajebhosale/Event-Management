import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckInsComponent } from './check-ins.component';

describe('CheckInsComponent', () => {
  let component: CheckInsComponent;
  let fixture: ComponentFixture<CheckInsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckInsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckInsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
