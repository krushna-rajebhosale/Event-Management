import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicRegisterComponent } from './public-register.component';

describe('PublicRegisterComponent', () => {
  let component: PublicRegisterComponent;
  let fixture: ComponentFixture<PublicRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicRegisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
